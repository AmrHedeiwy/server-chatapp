import { Op } from 'sequelize';
import db from '../../models/index.js';

/**
 * Adds a conversation between users.
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} otherUserId - The ID of the other user.
 * @param {boolean} isGroup - Indicates whether the conversation is a group conversation.
 * @param {Array} members - An array of members' data (if the conversation is a group).
 * @param {string} name - The name of the conversation (if the conversation is a group).
 * @returns {Promise<{conversation: object}>} - An object containing the conversation and its users.
 */
export const addConversation = async (
  currentUserId,
  otherUserId,
  isGroup,
  members,
  name
) => {
  try {
    if (isGroup && (!members || members.length < 2 || !name)) {
      throw new Error('InvalidConversationGroupCredentials');
    }

    if (isGroup) {
      // Create a new group conversation
      const newConversation = await db.Conversation.create({
        name,
        isGroup
      });

      // Add members to the conversation
      await newConversation.addUsers([...members.map((user) => user.UserID)]); // May need to add the current user depending on the request body sent from the frontend

      // Retrieve the conversation and its users
      const conversationUsers = await db.Conversation.findOne({
        where: { ConversationID: newConversation.ConversationID },
        include: 'Users'
      });

      return { conversationUsers };
    }

    // Check if a conversation already exists between the two users
    const existingConversation = await db.sequelize.query(
      `
        SELECT *
        FROM conversations as c
        INNER JOIN usersconversations as uc
        ON c."ConversationID" = uc."ConversationID"
        INNER JOIN users as u
        ON u."UserID" = uc."UserID"
        WHERE c."ConversationID" = (
          SELECT uc1."ConversationID"
          FROM usersconversations as uc1
          INNER JOIN usersconversations as uc2
          ON uc1."ConversationID" = uc2."ConversationID"
          WHERE uc1."UserID" = :otherUserId AND uc2."UserID"= :currentUserId
        )
      `,
      { replacements: { otherUserId, currentUserId } }
    );

    if (existingConversation[1].rowCount != 0) {
      // If conversation already exists, format and return the conversation data
      const results = existingConversation[0];

      const conversation = {
        ConversationID: results[0].ConversationID,
        CreatedAt: results[0].CreatedAt,
        LastMessageAt: results[0].LastMessageAt,
        Name: results[0].Name,
        IsGroup: results[0].IsGroup,
        Users: []
      };

      results.forEach((result) => {
        conversation.Users.push({
          UserID: result.UserID,
          Username: result.Username,
          Email: result.Email,
          Image: result.Image
        });
      });

      return { conversation };
    }

    // If no conversation exists, create a new one between the two users
    const newConversation = await db.Conversation.create();
    await newConversation.addUsers([currentUserId, otherUserId]);

    // Retrieve the conversation and its users
    const conversation = await db.Conversation.findOne({
      where: { ConversationID: newConversation.dataValues.ConversationID },
      include: ['Users']
    });

    return { conversation };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches conversations for a given user.
 * @param {string} currentUserId - The ID of the current user.
 * @returns {Promise<{conversations: object[]}>} - The fetched conversations in a formatted structure
 */
export const fetchConversations = async (currentUserId) => {
  try {
    // Retrieve the IDs of conversations involving the current user
    const conversationIDs = await db.Conversation.findAll({
      attributes: ['ConversationID'],
      include: [
        {
          model: db.User,
          as: 'Users',
          where: { UserID: { [Op.in]: [currentUserId] } },
          attributes: []
        }
      ]
    });

    // Retrieve the conversations and their related data
    const conversations = await db.Conversation.findAll({
      where: {
        ConversationID: {
          [Op.in]: conversationIDs.map(
            (conversation) => conversation.ConversationID
          )
        }
      },
      include: [
        {
          model: db.User,
          as: 'Users',
          attributes: ['UserID', 'Username', 'Email', 'Image', 'CreatedAt']
        }
      ],
      order: [['LastMessageAt', 'DESC']]
    });

    const formatedConversations = conversations.map((conversation) => {
      const {
        ConversationID,
        CreatedAt,
        LastMessageAt,
        Name,
        IsGroup,
        Users,
        Messages
      } = { ...conversation.dataValues };
      const otherUser = !IsGroup
        ? Users.find((user) => user.dataValues.UserID != currentUserId)
            .dataValues
        : null;

      delete otherUser.UserConversation;

      return {
        ConversationID,
        CreatedAt,
        LastMessageAt,
        IsGroup,
        Name: Name ?? otherUser.Username,
        Users,
        ...(!IsGroup && { OtherUser: otherUser }),
        Messages
      };
    });

    return { conversations: formatedConversations };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches a single conversation from the database
 * @param {string} conversationId - The ID of the conversation to fetch
 * @param {string} currentUserId - The ID of the current user
 * @returns {Promise<{ conversation: object }>} - The fetched conversation in a formatted structure
 */
export const fetchSingleConversation = async (
  conversationId,
  currentUserId
) => {
  // Fetch the conversation from the database
  const conversation = await db.Conversation.findOne({
    where: { ConversationID: conversationId },
    include: [
      {
        model: db.User,
        as: 'Users',
        include: {
          model: db.Message,
          as: 'Messages'
        }
      }
    ]
  });

  // Extract relevant properties from the conversation
  const { Name, CreatedAt, LastMessageAt, IsGroup, Users } =
    conversation.dataValues;

  // Determine the other user (if not a group conversation)
  const otherUser = !IsGroup
    ? Users.find((user) => user.dataValues.UserID !== currentUserId).dataValues
    : null;

  // Remove unnecessary property from the otherUser object
  delete otherUser.UserConversation;

  // Create a formatted conversation object
  const formattedConversation = {
    ConversationID: conversationId,
    CreatedAt,
    LastMessageAt,
    Name: Name ?? otherUser.Username,
    IsGroup,
    Users,
    ...(!IsGroup && { OtherUser: otherUser })
  };

  return { conversation: formattedConversation };
};

export default { addConversation, fetchConversations, fetchSingleConversation };
