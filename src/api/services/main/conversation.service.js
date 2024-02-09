import { Op } from 'sequelize';
import db from '../../models/index.js';
import { redisClient } from '../../../lib/redis-client.js';
import cloudinary from '../../../lib/cloudinary.js';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../../../app.js';

/**
 * Creates a new conversation between users or a group conversation.
 * @param {string} currentUserId - The ID of the current user initiating the conversation.
 * @param {string} otherUserId - The ID of the other user involved in the conversation (for single conversations).
 * @param {boolean} isGroup - Indicates whether the conversation is a group conversation.
 * @param {Array<Object>} members - Array of user objects for group conversations (optional).
 * @param {string} name - The name of the group conversation (required for group conversations).
 * @returns {Object} Object containing the newly created conversation and its users or an error.
 *    - {Object} conversation: The newly created conversation and its users, formatted with details.
 *    - {Object} conversationUsers: The newly created group conversation and its users.
 *    - {Object} conversation: The existing conversation between two users.
 *    - {Error} error: An error object if the conversation creation fails.
 * @throws {Error} Throws an error if invalid credentials are provided for group conversations.
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
      const conversation = await db.Conversation.findOne({
        include: {
          model: db.User,
          as: 'members',
          where: {
            userId: { [Op.in]: [currentUserId, ...members] }
          },
          required: true
        }
      });

      const otherMember = conversation.dataValues.members.find(
        (member) => member.userId === otherUserId
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

    // Retrieve the conversation and its users
    const conversationWithMembers = (
      await db.Conversation.findOne({
        where: { conversationId: newConversation.dataValues.conversationId },
        include: ['members']
      })
    ).dataValues;

    const {
      conversationId,
      lastMessageAt,
      members: allMembers
    } = conversationWithMembers;

    // Invalidate the cache for each user in the conversation
    allMembers.forEach((member) => {
      redisClient.del(`user_data:${member.userId}`);
    });

    // Format and return the newly created conversation data
    let otherMemberOrMembers = isGroup
      ? allMembers.filter((member) => member.userId !== currentUserId)
      : allMembers.find((member) => member.userId !== currentUserId);

    let adminIds = isGroup
      ? allMembers.filter((member) => member.Member.isAdmin)
      : null;

    let formatedConversations = {
      conversationId,
      createdAt,
      lastMessageAt,
      isGroup,
      name: name ?? otherMemberOrMembers.username,
      members: allMembers,
      ...(isGroup
        ? { otherMembers: otherMemberOrMembers, adminIds: adminIds }
        : { otherMember: otherMemberOrMembers })
    };

    if (!isGroup) {
      const otherUserId = members[0];
      const isSocketOnline = io.sockets.adapter.rooms.has(otherUserId);

      if (isSocketOnline)
        io.to(currentUserId).emit('connected', true, [otherUserId]);
    }

    return { conversation: formatedConversations };
  } catch (err) {
    // Return an error object if an exception occurs
    return { error: err };
  }
};

/**
 * Fetches conversations with associated messages and user details.
 * @param {string} currentUserId - The ID of the current user performing the fetch.
 * @param {Array<string>} conversationIds - Array of conversation IDs to fetch.
 * @returns {Object} Object containing formatted conversations and their messages or an error.
 *    - {Array<Object>} conversations: Formatted conversation objects with associated user details.
 *      Each conversation object contains:
 *        - {string} conversationId: The unique ID of the conversation.
 *        - {Date} createdAt: The date when the conversation was created.
 *        - {Date} lastMessageAt: The date when the last message was sent in the conversation.
 *        - {boolean} isGroup: Indicates if the conversation is a group conversation.
 *        - {string} name: The name of the conversation (if available), otherwise the other user's username.
 *        - {Array<Object>} users: Array of user objects participating in the conversation.
 *        - {Object} otherUser or otherUsers: The other user (for single conversations) or users (for group conversations) excluding the current user.
 *    - {Object} groupedMessages: Object containing grouped conversation messages with unseen messages count.
 *      The object keys are conversation IDs, and the values are message objects.
 *      Each message object contains:
 *        - {Array<Object>} messages: Array of message objects in the conversation.
 *        - {number} unseenMessagesCount: Count of unseen messages in the conversation.
 *        - {boolean} hasInitialNextPage: Indicates if there are more messages beyond the initial batch size.
 * @throws {Error} Throws an error if fetching conversations fails.
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
          { lastMessageAt: { [Op.ne]: null } }
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
            attributes: ['userId', 'image', 'username']
          }
        },
        // Include the sender of the message
        {
          model: db.User,
          as: 'sender',
          attributes: ['userId', 'username', 'image'],
          required: false
        }
      ],
      order: [['sentAt', 'DESC']],
      limit: BATCH_SIZE + 1
    });

    // Handle the case when no conversations are found
    if (conversations.length == 0)
      return { conversations: null, groupedMessages: null };

    // Group messages by conversation ID and format conversations
    let groupedMessages = messages.reduce((acc, message) => {
      let {
        messageId,
        conversationId,
        content,
        fileUrl,
        sentAt,
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

    // Format conversations
    let formattedConversations = conversations.reduce((acc, conversation) => {
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
export const getMessages = async (conversationId, page) => {
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
          as: 'deliverStatus',
          attributes: ['deliverAt'],
          where: {
            deliverAt: { [Op.ne]: null }
          },
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['userId', 'username', 'image', 'createdAt']
            }
          ],
          required: false
        },
        {
          model: db.MessageStatus,
          as: 'seenStatus',
          attributes: ['seenAt'],
          where: {
            seenAt: { [Op.ne]: null }
          },
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['userId', 'username', 'image', 'createdAt']
            }
          ],
          required: false
        },
        {
          model: db.User,
          as: 'sender',
          attributes: ['userId', 'username', 'image', 'createdAt']
        }
      ],
      order: [['sentAt', 'DESC']]
    });

    let hasNextPage = false;
    if (messages.length > BATCH_SIZE) {
      hasNextPage = true;
      messages.pop();
    }

    return { hasNextPage, items: messages };
  } catch (err) {
    return { error: err };
  }
};

export default { addConversation, fetchConversations, getMessages };
