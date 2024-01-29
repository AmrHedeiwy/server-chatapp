import { Op } from 'sequelize';
import db from '../../models/index.js';
import { redisClient } from '../../../config/redis-client.js';

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
  otherUserId,
  isGroup,
  members,
  name
) => {
  try {
    if (isGroup) {
      // Create a new group conversation
      const newConversation = await db.Conversation.create({
        name,
        isGroup,
        createdBy: currentUserId
      });

      // Add members to the conversation
      await newConversation.addUsers(members.map((user) => user.userId));

      // Retrieve the conversation and its users
      const conversationUsers = await db.Conversation.findOne({
        where: { conversationId: newConversation.conversationId },
        include: 'users'
      });

      return { conversationUsers };
    }

    // Check if a conversation already exists between the two users
    const existingConversation = await db.sequelize.query(
      `
        SELECT *
        FROM conversations c
        JOIN usersconversations as uc1 ON c."conversationId" = uc1."conversationId"
        JOIN usersconversations as uc2 ON c."conversationId" = uc2."conversationId"
        WHERE uc1."userId" = :otherUserId 
        AND uc2."userId" = :currentUserId;
      `,
      { replacements: { otherUserId, currentUserId } }
    );

    if (existingConversation[1].rowCount != 0) {
      // Format and return the existing conversation data
      const results = existingConversation[0];

      const conversation = {
        conversationId: results[0].conversationId,
        createdAt: results[0].createdAt,
        lastMessageAt: results[0].lastMessageAt,
        name: results[0].name,
        isGroup: results[0].isGroup,
        users: []
      };

      results.forEach((result) => {
        conversation.users.push({
          userId: result.userId,
          username: result.username,
          email: result.email,
          image: result.emage
        });
      });

      return { conversation };
    }

    // If no conversation exists, create a new one between the two users
    const newConversation = await db.Conversation.create({
      createdBy: currentUserId
    });

    await newConversation.addUsers([currentUserId, otherUserId]);

    // Retrieve the conversation and its users
    const conversation = await db.Conversation.findOne({
      where: { conversationId: newConversation.dataValues.conversationId },
      include: ['users']
    });

    // Invalidate the cache for each user in the conversation
    conversation.users.forEach((user) => {
      redisClient.del(`user_data:${user.userId}`);
    });

    // Format and return the newly created conversation data
    let otherUser = conversation.users.find(
      (user) => user.userId !== currentUserId
    );

    let formatedConversations = {
      conversationId: conversation.conversationId,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
      isGroup: false,
      name: otherUser.username,
      users: conversation.users,
      otherUser
    };

    return { conversation: formatedConversations };
  } catch (err) {
    // Return an error object if an exception occurs
    return { error: err };
  }
};

/**
 * Fetches conversations with associated messages and user details.
 * @param {string} currentUserId - Used in the database query.
 * @param {Array<string>} conversationIds - Array of conversation IDs to fetch.
 * @returns {Object} Object containing formatted conversations and their messages or an error.
 *    - {Array<Object>} conversations: Formatted conversation objects with associated user details.
 *      Each conversation object contains:
 *        - {string} conversationId: The unique ID of the conversation.
 *        - {Date} createdAt: The date when the conversation was created.
 *        - {Date} lastMessageAt: The date when the last message was sent in the conversation.
 *        - {boolean} isGroup: Indicates if the conversation is a group conversation.
 *        - {string} name: The name of the conversation (if available), otherwise other user's username.
 *        - {Array<Object>} users: Array of user objects participating in the conversation.
 *        - {Object} otherUser or otherUsers: The other user (for single conversations) or users (for group conversations) excluding the current user.
 *    - {Array<Object>} allConversationsMessages: Array of conversation messages including unseen messages count.
 *      Each conversation message object contains:
 *        - {string} conversationId: The unique ID of the conversation.
 *        - {Array<Object>} messages: Array of message objects in the conversation.
 *        - {number} unseenMessagesCount: Count of unseen messages in the conversation.
 * @throws {Error} Throws an error if fetching conversations fails.
 */
export const fetchConversations = async (currentUserId, conversationIds) => {
  try {
    const conversations = await db.Conversation.findAll({
      where: {
        conversationId: { [Op.in]: conversationIds },
        // The following condition filters conversations with no messages to the user that did not intiate the conversation.
        [Op.or]: [
          {
            // Get conversations that were intiated by the current user
            createdBy: currentUserId
          },
          {
            // Get any conversations with existing messages
            lastMessageAt: { [Op.ne]: null }
          }
        ]
      },
      include: [
        // Include all the users in the conversation
        {
          model: db.User,
          as: 'users',
          attributes: ['userId', 'username', 'email', 'image', 'createdAt']
        },
        /**
         * Include all the messages in the covnersation except messages that are not sent by the user and
         * have not been delivered.
         *
         * The excluded messages will be sent from socket.io.
         * Since these messages are being fetched from the server component on the frontend, the socket
         * may not be connected and any messages that are sent between the timeframe of the intial fetch and
         * the socket connection, it will be missed.
         */
        {
          model: db.Message,
          as: 'messages',
          where: {
            [Op.or]: [
              {
                messageId: {
                  [Op.in]: db.sequelize.literal(`(
                    SELECT "messageId"
                    FROM messagestatus as ms
                    WHERE ms."messageId" = "messages"."messageId" -- Compare with the outer query message
                    AND ms."userId" = '${currentUserId}'
                    AND ms."deliverAt" IS NOT NULL
                    AND ms."seenAt" IS NOT NULL
                    LIMIT 20
                  )`)
                }
              },
              {
                messageId: {
                  [Op.in]: db.sequelize.literal(`(
                    SELECT "messageId"
                    FROM messages as m
                    WHERE m."messageId" = "messages"."messageId" -- Compare with the outer query message 
                    AND m."senderId" = '${currentUserId}'
                    LIMIT 20
                  )`)
                }
              },
              {
                messageId: {
                  [Op.in]: db.sequelize.literal(`(
                    SELECT "messageId"
                    FROM messagestatus as ms
                    WHERE ms."messageId" = "messages"."messageId" -- Compare with the outer query message  
                    AND ms."userId" = '${currentUserId}' 
                    AND ms."deliverAt" IS NOT NULL 
                    AND ms."seenAt" IS NULL
                  )`)
                }
              }
            ]
          },
          include: [
            // Include all the users that the message was delivered to
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
            // Include all the users that the message was seen by
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
            // Include the sender of the message
            {
              model: db.User,
              as: 'user',
              attributes: ['userId', 'username', 'image', 'createdAt']
            }
          ],
          required: false,
          subQuery: false
        }
      ],
      attributes: {
        include: [
          // To show the number of unseen messages for each conversation
          [
            db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM messagestatus as ms
              WHERE ms."userId" = '${currentUserId}'
              AND ms."deliverAt" IS NOT NULL
              AND ms."seenAt" IS NULL
              AND ms."messageId" IN (
                SELECT "messageId"
                FROM messages as m
                WHERE m."conversationId" = "Conversation"."conversationId"
              )
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
        ],
        [{ model: db.Message, as: 'messages' }, 'createdAt', 'DESC']
      ]
    });

    // Handle the case when no conversations are found
    if (conversations.length == 0) return { conversations: [] };

    let formatedConversations = [];
    let allConversationsMessages = [];

    for (const conversation of conversations) {
      const {
        conversationId,
        createdAt,
        lastMessageAt,
        name,
        isGroup,
        users,
        messages,
        unseenMessagesCount
      } = { ...conversation.dataValues };

      allConversationsMessages.push({
        conversationId,
        messages: [...messages],
        unseenMessagesCount: parseInt(unseenMessagesCount)
      });

      const otherUserOrUsers = !isGroup
        ? users.find((user) => user.dataValues.userId != currentUserId)
        : users.filter((user) => user.dataValues.userId != currentUserId);

      formatedConversations.push({
        conversationId,
        createdAt,
        lastMessageAt,
        isGroup,
        name: name ?? otherUserOrUsers.username,
        users,
        ...(!isGroup
          ? { otherUser: otherUserOrUsers }
          : { otherUsers: otherUserOrUsers })
      });
    }

    return { conversations: formatedConversations, allConversationsMessages };
  } catch (err) {
    return { error: err };
  }
};

export default { addConversation, fetchConversations };
