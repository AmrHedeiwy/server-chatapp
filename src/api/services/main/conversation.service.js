import { Op } from 'sequelize';
import db from '../../models/index.js';
import { redisClient } from '../../../lib/redis-client.js';
import { io } from '../../../app.js';

/**
 * Creates a new conversation between users or a group conversation.
 * @param {number} currentUserId - The ID of the current user initiating the conversation.
 * @param {boolean} exists - Boolean indicating whether the conversation already exists.
 * @param {string} name - Name of the conversation (for groups).
 * @param {string[]} members - Array of user IDs who are members of the conversation.
 * @param {boolean} isGroup - Boolean indicating whether it's a group conversation.
 * @returns {Object} Object containing the newly created conversation and its members or an error.
 *    - {Object} conversation: The newly created conversation and its members, formatted with details.
 *    - {Error} error: An error object if the conversation creation fails.
 * @throws {Error} Throws an error if an exception occurs during execution.
 */
export const addConversation = async (
  currentUserId,
  exists,
  name,
  members,
  isGroup
) => {
  try {
    // If a conversation already exists for one-to-one conversations
    if (exists) {
      // Find the existing conversation
      const conversation = await db.Conversation.findOne({
        include: {
          model: db.User,
          as: 'members',
          where: {
            userId: { [Op.in]: [currentUserId, ...members] } // Include current user and other member
          },
          required: true
        }
      });

      const otherMember = conversation.dataValues.members.find(
        (member) => member.userId !== currentUserId
      );

      conversation.dataValues.otherMember = otherMember;
      conversation.dataValues.name = otherMember.username;

      return { conversation };
    }

    const createdAt = new Date();

    // If no conversation exists, create a new conversation
    const newConversation = await db.Conversation.create({
      ...(isGroup ? { name } : {}),
      isGroup,
      createdAt,
      createdBy: currentUserId
    });

    await newConversation.addMembers([currentUserId, ...members]);

    if (isGroup) {
      // If it's a group conversation, set the current user as admin
      await db.Member.update(
        { isAdmin: true },
        {
          where: {
            userId: currentUserId,
            conversationId: newConversation.dataValues.conversationId
          }
        }
      );
    }

    // Retrieve the conversation with its members information
    const conversationWithMembers = (
      await db.Conversation.findOne({
        where: { conversationId: newConversation.dataValues.conversationId },
        include: [
          {
            model: db.User,
            as: 'members',
            attributes: ['userId', 'username', 'image']
          }
        ]
      })
    ).dataValues;

    const {
      conversationId,
      lastMessageAt,
      members: allMembers
    } = conversationWithMembers;

    // Format and return the newly created conversation data
    const otherMemberOrMembers = isGroup
      ? allMembers.filter((member) => member.userId !== currentUserId)
      : allMembers.find((member) => member.userId !== currentUserId);

    const adminIds = isGroup
      ? allMembers.reduce((acc, member) => {
          if (member.Member.isAdmin) acc.push(member.userId);
          return acc;
        }, [])
      : null;

    const formatedConversation = {
      conversationId,
      createdAt,
      lastMessageAt,
      isGroup,
      name: name ?? otherMemberOrMembers.username,
      members: allMembers,
      ...(isGroup
        ? { otherMembers: otherMemberOrMembers, adminIds: adminIds }
        : { otherMember: otherMemberOrMembers }),
      hasInitialNextPage: false
    };

    allMembers.forEach((member) => {
      const socket = io.sockets.sockets.get(member.userId);

      // Join the socket to the conversation room if the socket in online
      if (socket) socket.join(conversationId);

      // Clear user data cache so that it is updated with the new conversation
      redisClient.del(`user_data:${member.userId}`);
    });

    if (!isGroup) {
      // Check if the other user in the one-to-one conversation is online
      const otherUserId = members[0];
      const isSocketOnline = io.sockets.adapter.rooms.has(otherUserId);

      // Emit a 'connected' event to the current user to notify that the other user is online
      if (isSocketOnline)
        io.to(currentUserId).emit('connected', true, [otherUserId]);
    } else {
      // For group conversations, emit an event to other members about the new conversation
      const { otherMembers, ...otherProps } = formatedConversation;

      io.to(conversationId).except(currentUserId).emit('new_group_chat', {
        conversation: otherProps
      });
    }

    return { conversation: formatedConversation };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches conversations with associated messages and user details.
 * @param {string} currentUserId - The ID of the current user performing the fetch.
 * @param {Array<string>} conversationIds - Array of conversation IDs to fetch.
 * @returns {Object} An object containing formatted conversations and grouped messages, or an error object.
 */
export const fetchConversations = async (currentUserId, conversationIds) => {
  const BATCH_SIZE = 20;
  try {
    const conversations = await db.Conversation.findAll({
      where: {
        conversationId: { [Op.in]: conversationIds },
        // Filter conversations with no messages to the user that did not initiate the conversation.
        [Op.or]: [
          // Get conversations initiated by the current user
          { createdBy: currentUserId },
          // Get conversations with existing messages
          { lastMessageAt: { [Op.ne]: null } },
          { isGroup: { [Op.eq]: true } }
        ]
      },
      include: [
        // Include all the users in the conversation
        {
          model: db.User,
          as: 'members',
          attributes: ['userId', 'username', 'image']
        }
      ],
      attributes: {
        // Include the count of unseen messages for each conversation
        include: [
          [
            db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM messagestatus as ms
              WHERE ms."userId" = '${currentUserId}'
              AND ms."messageId" IN (
                SELECT "messageId"
                FROM messages as m
                WHERE m."conversationId" = "Conversation"."conversationId"
              )
              AND ms."deliverAt" IS NOT NULL
              AND ms."seenAt" IS NULL
    
            )`),
            'unseenMessagesCount'
          ]
        ]
      },
      order: [
        [
          db.sequelize.literal(
            'CASE WHEN "lastMessageAt" IS NOT NULL THEN "lastMessageAt" ELSE "Conversation"."createdAt" END'
          ),
          'DESC'
        ]
      ]
    });

    // Message of all conversations
    const messages = await db.Message.findAll({
      where: {
        conversationId: { [Op.in]: conversationIds }
      },
      attributes: [
        'messageId',
        'conversationId',
        'content',
        'fileUrl',
        'sentAt',
        'updatedAt',
        'deletedAt',
        'senderId'
      ],
      include: [
        {
          model: db.MessageStatus,
          as: 'status',
          attributes: ['deliverAt', 'seenAt'],
          /**
           * Include all the messages in the conversation except messages that are not sent by the user and
           * have not been delivered.
           *
           * The excluded messages will be sent from socket.io.
           * Since these messages are being fetched from the server component on the frontend, the socket
           * may not be connected and any messages that are sent between the timeframe of the initial fetch and
           * the socket connection will be missed.
           */
          where: {
            [Op.or]: [
              {
                deliverAt: { [Op.ne]: null }
              },
              {
                userId: { [Op.ne]: currentUserId }
              }
            ]
          },
          required: true,
          include: {
            model: db.User,
            as: 'user',
            attributes: ['userId', 'username', 'image']
          },
          limit: BATCH_SIZE + 1
        },
        // Include the sender of the message
        {
          model: db.User,
          as: 'sender',
          attributes: ['userId', 'username', 'image'],
          required: false
        }
      ],
      paranoid: false,
      order: [['sentAt', 'DESC']]
    });

    // Handle the case when no conversations are found
    if (conversations.length == 0)
      return { conversations: null, groupedMessages: null };

    // Group messages by conversation ID
    let groupedMessages = messages.reduce((acc, message) => {
      let {
        messageId,
        conversationId,
        content,
        fileUrl,
        sentAt,
        updatedAt,
        deletedAt,
        sender,
        senderId,
        status
      } = message.dataValues;

      if (!acc[conversationId]) {
        acc[conversationId] = {
          messages: [],
          unseenMessagesCount: 0,
          hasInitialNextPage: false
        };
      }

      let deliverCount = 0;
      let seenCount = 0;

      if (senderId === currentUserId) {
        status = status.reduce((acc, userStatus) => {
          const { deliverAt, seenAt, user } = userStatus.dataValues;

          if (deliverAt) deliverCount += 1;
          if (seenAt) seenCount += 1;

          acc[user.userId] = { ...userStatus.dataValues };
          return acc;
        }, {});
      }

      acc[conversationId].messages.push({
        messageId,
        conversationId,
        content,
        fileUrl,
        sentAt,
        updatedAt,
        deletedAt,
        sender,
        ...(senderId === currentUserId
          ? { status, deliverCount, seenCount }
          : {})
      });

      // Check if the number of messages exceeds the batch size
      if (acc[conversationId].messages.length > BATCH_SIZE) {
        acc[conversationId].hasInitialNextPage = true;
        acc[conversationId].messages.pop(); // Remove the extra message beyond the batch size
      }
      return acc;
    }, {});

    const formattedConversations = conversations.reduce((acc, conversation) => {
      const {
        conversationId,
        createdAt,
        lastMessageAt,
        name,
        isGroup,
        image,
        members,
        unseenMessagesCount
      } = conversation.dataValues;

      if (!acc[conversationId]) {
        const otherMemberOrMembers = !isGroup
          ? members.find((member) => member.dataValues.userId !== currentUserId)
          : members.filter(
              (member) => member.dataValues.userId !== currentUserId
            );

        const adminIds = isGroup
          ? members.reduce((acc, member) => {
              if (member.Member.isAdmin) acc.push(member.userId);
              return acc;
            }, [])
          : null;

        acc[conversationId] = {
          conversationId,
          createdAt,
          lastMessageAt,
          isGroup,
          image,
          name: name ?? otherMemberOrMembers.username,
          members,
          ...(isGroup
            ? { otherMembers: otherMemberOrMembers, adminIds }
            : { otherMember: otherMemberOrMembers }),
          hasInitialNextPage:
            !!groupedMessages[conversationId]?.hasInitialNextPage
        };
      }

      // Set unseen messages count for the conversation
      if (groupedMessages[conversationId]) {
        groupedMessages[conversationId].unseenMessagesCount =
          parseInt(unseenMessagesCount);
      } else {
        groupedMessages[conversationId] = {
          messages: [],
          unseenMessagesCount: 0
        };
      }

      return acc;
    }, {});

    return {
      conversations: formattedConversations,
      groupedMessages
    };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches the next batch of messages in a conversation for pagination.
 * @param {string} currentUserId - Used to format the status object of each message correctly
 * @param {string} conversationId - The ID of the conversation to fetch messages from.
 * @param {number} page - The page number for pagination (0-indexed).
 * @returns {Object} Object containing the fetched messages and pagination information.
 *    - {boolean} hasNextPage: Indicates whether there are more messages beyond the current page.
 *    - {Array<Object>} items: Array of message objects for the current page.
 *      Each message object contains the following properties:
 *        - {string} messageId: The unique ID of the message.
 *        - {string} senderId: The unique ID of the user that sent the message.
 *        - {string} conversationId: The ID of the conversation to which the message belongs.
 *        - {string} body: The body of the message.
 *        - {string} image: The URL of the user's profile image.
 *        - {Date} createdAt: The date when the message was created.
 *        - {Object} user: Details of the user who sent the message.
 *          - {string} userId: The unique ID of the user.
 *          - {string} username: The username of the user.
 *          - {string} image: The URL of the user's profile image.
 *          - {Date} createdAt: The date when the user account was created.
 *        - {Array<Object>} deliverStatus: Array of message delivery status objects.
 *          Each delivery status object contains:
 *            - {Date} deliverAt: The date when the message was delivered.
 *            - {Object} user: Details of the user who received the message.
 *              - {string} userId: The unique ID of the user.
 *              - {string} username: The username of the user.
 *              - {string} image: The URL of the user's profile image.
 *              - {Date} createdAt: The date when the user account was created.
 *        - {Array<Object>} seenStatus: Array of message seen status objects.
 *          Each seen status object contains:
 *            - {Date} seenAt: The date when the message was seen by the user.
 *            - {Object} user: Details of the user who saw the message.
 *              - {string} userId: The unique ID of the user.
 *              - {string} username: The username of the user.
 *              - {string} image: The URL of the user's profile image.
 *              - {Date} createdAt: The date when the user account was created.
 * @throws {Error} Throws an error if fetching messages fails.
 */
export const getMessages = async (currentUserId, conversationId, page) => {
  const BATCH_SIZE = 20;
  try {
    // Find 20 and count all messages
    const messages = await db.Message.findAll({
      where: { conversationId },
      offset: page,
      limit: BATCH_SIZE + 1, // Fetch a batch of 20 messages for pagination
      include: [
        {
          model: db.MessageStatus,
          as: 'status',
          attributes: ['deliverAt', 'seenAt'],
          include: {
            model: db.User,
            as: 'user',
            attributes: ['userId', 'username', 'image']
          }
        },
        {
          model: db.User,
          as: 'sender',
          attributes: ['userId', 'username', 'image']
        }
      ],
      order: [['sentAt', 'DESC']],
      paranoid: false
    });

    let hasNextPage = false;
    if (messages.length > BATCH_SIZE) {
      hasNextPage = true;
      messages.pop();
    }

    const formatedMessage = messages.map((message) => {
      let {
        messageId,
        conversationId,
        content,
        fileUrl,
        sentAt,
        updatedAt,
        deletedAt,
        sender,
        senderId,
        status
      } = message.dataValues;

      let deliverCount = 0;
      let seenCount = 0;

      if (senderId === currentUserId) {
        status = status.reduce((acc, userStatus) => {
          const { deliverAt, seenAt, user } = userStatus.dataValues;

          if (deliverAt) deliverCount += 1;
          if (seenAt) seenCount += 1;

          acc[user.userId] = { ...userStatus.dataValues };

          return acc;
        }, {});
      }

      return {
        messageId,
        conversationId,
        content,
        fileUrl,
        sentAt,
        updatedAt,
        deletedAt,
        sender,
        ...(senderId === currentUserId
          ? { status, deliverCount, seenCount }
          : {})
      };
    });

    return { hasNextPage, items: formatedMessage };
  } catch (err) {
    return { error: err };
  }
};

export default { addConversation, fetchConversations, getMessages };
