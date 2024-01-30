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
          as: 'users',
          attributes: ['userId', 'username', 'email', 'image', 'createdAt']
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
        ]
      ]
    });

    const messages = await db.Message.findAll({
      where: { conversationId: { [Op.in]: conversationIds } },
      include: [
        {
          model: db.MessageStatus,
          as: 'status',
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
                deliverAt: { [Op.ne]: null },
                seenAt: { [Op.or]: [{ [Op.ne]: null }, { [Op.eq]: null }] }
              },
              { userId: { [Op.ne]: currentUserId } }
            ]
          },
          required: true,
          limit: BATCH_SIZE + 1
        },
        // Include all the users that the message was delivered to
        {
          model: db.MessageStatus,
          as: 'deliverStatus',
          attributes: ['deliverAt'],
          where: { deliverAt: { [Op.ne]: null } },
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
          where: { seenAt: { [Op.ne]: null } },
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
          attributes: ['userId', 'username', 'image', 'createdAt'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Handle the case when no conversations are found
    if (conversations.length == 0)
      return { conversations: null, groupedMessages: null };

    // Group messages by conversation ID and format conversations
    let groupedMessages = messages.reduce((acc, message) => {
      const conversationId = message.dataValues.conversationId;
      if (!acc[conversationId]) {
        acc[conversationId] = {
          messages: [],
          unseenMessagesCount: 0,
          hasInitialNextPage: false
        };
      }
      acc[conversationId].messages.push(message);

      // Check if the number of messages exceeds the batch size
      if (acc[conversationId].messages.length > BATCH_SIZE) {
        acc[conversationId].hasInitialNextPage = true;
        acc[conversationId].messages.pop(); // Remove the extra message beyond the batch size
      }
      return acc;
    }, {});

    // Format conversations
    let formattedConversations = conversations.map((conversation) => {
      const {
        conversationId,
        createdAt,
        lastMessageAt,
        name,
        isGroup,
        users,
        unseenMessagesCount
      } = conversation.dataValues;

      const otherUserOrUsers = !isGroup
        ? users.find((user) => user.dataValues.userId !== currentUserId)
        : users.filter((user) => user.dataValues.userId !== currentUserId);

      // Set unseen messages count for the conversation
      groupedMessages[conversationId].unseenMessagesCount =
        parseInt(unseenMessagesCount);

      return {
        conversationId,
        createdAt,
        lastMessageAt,
        isGroup,
        name: name ?? otherUserOrUsers.username,
        users,
        ...(isGroup
          ? { otherUsers: otherUserOrUsers }
          : { otherUser: otherUserOrUsers }),
        hasInitialNextPage: groupedMessages[conversationId].hasInitialNextPage
      };
    });

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
          as: 'user',
          attributes: ['userId', 'username', 'image', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
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
