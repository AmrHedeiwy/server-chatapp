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
    if (exists) {
      // If the conversation already exists, retrieve the conversation details
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

      // Add additional details to the conversation object
      conversation.dataValues.otherMember = otherMember;
      conversation.dataValues.name = otherMember.dataValues.username;

      return { conversation };
    }

    // If no conversation exists, create a new conversation
    const createdAt = new Date();
    const newConversation = await db.Conversation.create({
      ...(isGroup ? { name } : {}), // Include the name if it's a group conversation
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

    // Determine the other member or members (depending on group or one-to-one conversation)
    const otherMemberOrMembers = isGroup
      ? allMembers.filter((member) => member.userId !== currentUserId)
      : allMembers.find((member) => member.userId !== currentUserId);

    // Determine admin IDs (for group conversations)
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
 * Fetches conversations and their associated messages.
 *
 * @param {string} currentUserId - The ID of the current user performing the fetch.
 * @param {Array<string>} conversationIds - Array of conversation IDs to fetch.
 * @returns {Object} An object containing formatted conversations and grouped messages, or an error object.
 *    - {Object} conversations: Formatted conversations and their details.
 *    - {Object} groupedMessages: Grouped messages for each conversation.
 *    - {Error} error: An error object if the fetch operation fails.
 * @throws {Error} Throws an error if an exception occurs during execution.
 */
export const fetchConversations = async (currentUserId, conversationIds) => {
  const BATCH_SIZE = 20;
  try {
    const conversations = await db.Conversation.findAll({
      where: {
        conversationId: { [Op.in]: conversationIds },
        /**
         * Fetch conversations based on any of the following criterias:
         * - Conversations initiated by the current user
         * - Conversations with existing messages
         * - Group conversations
         */
        [Op.or]: [
          { createdBy: currentUserId },
          { lastMessageAt: { [Op.ne]: null } },
          { isGroup: { [Op.eq]: true } }
        ]
      },
      include: [
        // Include user profile for all members of each conversation
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
        // Order conversations by last message date or creation date if no messages exist
        [
          db.sequelize.literal(
            'CASE WHEN "lastMessageAt" IS NOT NULL THEN "lastMessageAt" ELSE "Conversation"."createdAt" END'
          ),
          'DESC'
        ]
      ]
    });

    // Handle the case when no conversations are found
    if (conversations.length == 0)
      return { conversations: null, groupedMessages: null };

    /**
     * Goal:
     * 1. Format each conversation in an object where the key is the conversationId and the value is the info of the conversation.
     * 2. Format the messages of each conversation where the key is the conversationId and the value is the info of the message.
     *
     *
     * @example formattedConversations object:
     * {
     *   'conversation1.id': {
     *     ...details of conversation1
     *   },
     *   'conversation2.id': {
     *     ...details of conversation2
     *   },
     * }
     *
     * @example groupedMessages object:
     * {
     *   'conversation1.id': {
     *     messages: [ ...details of each message in conversation1 ],
     *     unseenMessagesCount: number of unseen messages in conversation1
     *   },
     *   'conversation2.id': {
     *     messages: [ ...details of each message in conversation2 ],
     *     unseenMessagesCount: number of unseen messages in conversation2
     *   }
     * }
     */

    let groupedMessages = {};
    let formatedConversations = {};

    // Loop through each conversation
    for (const conversation of conversations) {
      // Extract conversation details
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

      // Determine the other member or members (depending on group or one-to-one conversation)
      const otherMemberOrMembers = !isGroup
        ? members.find((member) => member.dataValues.userId !== currentUserId)
        : members.filter(
            (member) => member.dataValues.userId !== currentUserId
          );

      // Determine admin IDs (for group conversations)
      const adminIds = isGroup
        ? members.reduce((acc, member) => {
            if (member.Member.isAdmin) acc.push(member.userId);
            return acc;
          }, [])
        : null;

      // Format conversation details
      formatedConversations[conversationId] = {
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
        hasInitialNextPage: false
      };

      // Retrieve messages for the conversation
      const messages = await db.Message.findAll({
        where: {
          conversationId
        },
        include: [
          // Include message status
          {
            model: db.MessageStatus,
            as: 'status',
            attributes: ['deliverAt', 'seenAt'],
            where: {
              /**
               * Include all the messages in the conversation except messages are not yet delivered to the current user
               *
               * The excluded messages will be sent from socket event.
               * Since these messages are being fetched from the server component on the frontend, the socket
               * may not be connected and any messages that are sent between the timeframe of the initial fetch and
               * the socket connection will be missed.
               */
              [Op.or]: [
                { deliverAt: { [Op.ne]: null } }, // Messages with delivery confirmation
                { userId: { [Op.ne]: currentUserId } } // Messages sent by the current user
              ]
            },
            include: {
              // Include user profile for message status
              model: db.User,
              as: 'user',
              attributes: ['userId', 'username', 'image']
            },
            required: true
          },
          // Include sender's profile
          {
            model: db.User,
            as: 'sender',
            attributes: ['userId', 'username', 'image'],
            required: false
          }
        ],
        paranoid: false, // Include soft-deleted messages
        order: [['sentAt', 'DESC']],
        limit: BATCH_SIZE + 1
      });

      // Format messages and count unseen messages
      groupedMessages[conversationId] = messages.reduce(
        (acc, message, i) => {
          if (i + 1 > BATCH_SIZE) {
            formatedConversations[conversationId].hasInitialNextPage = true;
            return acc;
          }

          const { senderId, ...otherFields } = message.dataValues;

          // Initialize message counters for delivery and read status
          let deliverCount = 0;
          let seenCount = 0;
          let formatedStatus = {};

          // Process message status if sent by the current user
          if (senderId === currentUserId) {
            formatedStatus = otherFields.status.reduce((acc, userStatus) => {
              const { deliverAt, seenAt, user } = userStatus.dataValues;

              // Update delivery and read counters based on message status
              if (!!deliverAt) deliverCount += 1;
              if (!!seenAt) seenCount += 1;

              acc[user.userId] = { ...userStatus.dataValues };
              return acc;
            }, {});
          }

          // Check if the number of messages exceeds the batch size
          acc.messages.push({
            ...otherFields,
            ...(senderId === currentUserId
              ? { status: formatedStatus, deliverCount, seenCount }
              : {})
          });

          return acc;
        },
        {
          messages: [],
          unseenMessagesCount: parseInt(unseenMessagesCount)
        }
      );
    }

    return {
      conversations: formatedConversations,
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
 * @throws {Error} Throws an error if fetching messages fails.
 */
export const getMessages = async (currentUserId, conversationId, page) => {
  const BATCH_SIZE = 20;
  try {
    const messages = await db.Message.findAll({
      where: { conversationId },
      offset: page, // Calculate the offset based on the page number
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

    // Check if there are more messages to load
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

    /**
     * @example
     * { hasNextPage: true/false, items: [ {...message1}, {...message2}, {...message3} ] }
     */
    return { hasNextPage, items: formatedMessage };
  } catch (err) {
    return { error: err };
  }
};

export default { addConversation, fetchConversations, getMessages };
