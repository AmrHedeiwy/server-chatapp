import { Op } from 'sequelize';
import db from '../../models/index.js';
import { redisClient } from '../../../lib/redis-client.js';
import { io } from '../../../app.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import { uploader } from '../../../lib/uploader.js';
import { MissingSystemDataError } from '../../helpers/ErrorTypes.helper.js';

/**
 * Adds a new conversation to the database and notifies relevant users about the conversation creation.
 *
 * @param {string} currentUserId - The ID of the current user initiating the conversation.
 * @param {boolean} exists - Indicates whether the conversation already exists.
 * @param {Array<string>} memberIds - An array of member IDs participating in the conversation.
 * @param {string} name - The name of the conversation (if it's a group conversation).
 * @param {boolean} isGroup - Indicates whether the conversation is a group conversation.
 * @param {boolean} isImage - Indicates whether the conversation involves an image (for group conversations).
 * @returns {Promise<{ status: string, conversation: Object }> | { error: Error }} A promise resolving to a success message and the created conversation object, or an error object.
 * @throws {MissingSystemDataError} If necessary data for creating the conversation is missing.
 */
export const addConversation = async (
  currentUserId,
  exists,
  memberIds,
  name,
  isGroup,
  isImage
) => {
  try {
    if (isGroup && (!name || isImage === undefined))
      throw new MissingSystemDataError('ADD_CONVERSATION', {
        isGroup,
        name,
        isImage
      });

    if (exists) {
      // If the conversation already exists, retrieve the conversation details
      const result = await db.sequelize.query(
        `
          SELECT c."conversationId"
          FROM conversations c
          JOIN members as uc1 ON c."conversationId" = uc1."conversationId"
          JOIN members as uc2 ON c."conversationId" = uc2."conversationId"
          WHERE uc1."userId" = :otherUserId 
          AND uc2."userId" = :currentUserId
          AND c."isGroup" = false;
        `,
        { replacements: { otherUserId: memberIds[0], currentUserId } }
      );

      const conversationId = result[0][0].conversationId;

      const conversation = await db.Conversation.findOne({
        where: { conversationId },
        include: {
          model: db.Member,
          as: 'members',
          required: true,
          include: {
            model: db.User,
            as: 'profile',
            attributes: ['userId', 'username', 'image']
          }
        }
      });

      const otherMember = conversation.dataValues.members.find(
        (member) => member.userId !== currentUserId
      );

      // Add additional details to the conversation object
      conversation.dataValues.otherMember = otherMember;

      return { status: successJson.status.ok, conversation };
    }

    // If no conversation exists, create a new conversation
    const createdAt = new Date();
    const newConversation = await db.Conversation.create({
      ...(isGroup ? { name } : {}), // Include the name if it's a group conversation
      isGroup,
      createdAt,
      image: isGroup && isImage ? 'pending' : null,
      createdBy: currentUserId
    });

    await newConversation.addUsers([currentUserId, ...memberIds]);

    if (isGroup) {
      // Set the current user as admin for group conversations
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

    // Retrieve the conversation with its members and their profiles
    const conversationWithMembers = (
      await db.Conversation.findOne({
        where: { conversationId: newConversation.dataValues.conversationId },
        include: [
          {
            model: db.Member,
            as: 'members',
            include: {
              model: db.User,
              as: 'profile',
              attributes: ['userId', 'username', 'image']
            }
          }
        ]
      })
    ).dataValues;

    const { conversationId, image, members, createdBy, lastMessageAt } =
      conversationWithMembers;

    // Determine the other member or members (depending on group or one-to-one conversation)
    const otherMemberOrMembers = isGroup
      ? members.filter((member) => member.userId !== currentUserId)
      : members.find((member) => member.userId !== currentUserId);

    const formattedConversation = {
      conversationId,
      createdAt,
      createdBy,
      lastMessageAt,
      isGroup,
      image,
      name,
      members,
      ...(isGroup
        ? {
            otherMembers: otherMemberOrMembers,
            adminIds: members.reduce((acc, member) => {
              if (member.isAdmin) acc.push(member.userId);
              return acc;
            }, [])
          }
        : { otherMember: otherMemberOrMembers }),
      hasInitialNextPage: false
    };

    members.forEach((member) => {
      const socket = io.sockets.sockets.get(member.userId);

      // Join the socket to the conversation room if the socket is online
      if (socket) socket.join(conversationId);

      // Clear user data cache so that it is updated with the new conversation
      redisClient.del(`user_data:${member.userId}`);
    });

    if (!isGroup) {
      // Check if the other user in the one-to-one conversation is online
      const otherUserId = memberIds[0];
      const isSocketOnline = io.sockets.adapter.rooms.has(otherUserId);

      // Emit a 'connected' event to the current user to notify that the other user is online
      if (isSocketOnline) {
        io.to(currentUserId).emit('connected', true, [otherUserId]);
        io.to(otherUserId).emit('connected', true, [currentUserId]);
      }
    } else {
      // For group conversations, emit an event to the other members about the new conversation
      const { otherMembers, ...otherFields } = formattedConversation;

      io.to(conversationId).except(currentUserId).emit('new_group_chat', {
        conversation: otherFields
      });
    }

    return {
      status: successJson.status.created,
      conversation: formattedConversation
    };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Fetches conversations and their messages based on provided conversation IDs and current user ID.
 * 
 * @param {Array<string>} conversationIds - An array of conversation IDs to fetch.
 * @param {string} currentUserId - The ID of the current user.
 * @returns {Promise<{ status: string, conversations: Object, groupedMessages: Object }> | { error: Error }} 
    A promise resolving to an object containing fetched conversations, grouped messages, and status, or an error object.
 */
export const fetchConversations = async (conversationIds, currentUserId) => {
  // Define the batch size for fetching messages
  const BATCH_SIZE = 20;
  try {
    // Fetch conversations based on provided conversation IDs and certain criteria
    const conversations = await db.Conversation.findAll({
      where: {
        conversationId: { [Op.in]: conversationIds },
        // Fetch conversations initiated by the current user, conversations with existing messages,
        // and group conversations
        [Op.or]: [
          { createdBy: currentUserId },
          { lastMessageAt: { [Op.ne]: null } },
          { isGroup: true }
        ]
      },
      include: [
        // Include user profiles for all members of each conversation
        {
          model: db.Member,
          as: 'members',
          include: {
            model: db.User,
            as: 'profile',
            attributes: ['userId', 'username', 'image']
          }
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
      return {
        status: successJson.status.ok,
        conversations: null,
        groupedMessages: null
      };

    let groupedMessages = {};
    let formattedConversations = {};

    // Loop through each conversation to format and group messages
    for (const conversation of conversations) {
      // Extract conversation details
      const {
        conversationId,
        name,
        image,
        isGroup,
        members,
        createdBy,
        createdAt,
        lastMessageAt,
        unseenMessagesCount
      } = conversation.dataValues;

      let currentMember = null;
      // Determine the other member or members (depending on group or one-to-one conversation)
      const otherMemberOrMembers = members.filter((member) => {
        if (member.dataValues.userId !== currentUserId) return member;
        currentMember = member;
      });

      // Format conversation details
      formattedConversations[conversationId] = {
        conversationId,
        createdBy,
        createdAt,
        lastMessageAt,
        isGroup,
        image,
        name,
        members,
        ...(isGroup
          ? {
              otherMembers: otherMemberOrMembers,
              adminIds: members.reduce((acc, member) => {
                if (member.isAdmin) acc.push(member.userId);
                return acc;
              }, [])
            }
          : { otherMember: otherMemberOrMembers[0] }),
        hasInitialNextPage: false
      };

      // Retrieve messages for the conversation
      const messages = await db.Message.findAll({
        where: {
          conversationId,
          sentAt: { [Op.gt]: currentMember.dataValues.joinedAt }
        },
        include: [
          // Include message status
          {
            model: db.MessageStatus,
            as: 'status',
            attributes: ['deliverAt', 'seenAt'],
            where: {
              // Include all the messages in the conversation except messages that are not yet delivered to the current user
              [Op.or]: [
                { deliverAt: { [Op.ne]: null } }, // Messages with delivery confirmation
                { userId: { [Op.ne]: currentUserId } } // Messages sent by other users
              ]
            },
            include: {
              // Include user profile for message status
              model: db.User,
              as: 'profile',
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
        limit: BATCH_SIZE + 1 // Limit the number of messages fetched
      });

      // Format messages and count unseen messages
      groupedMessages[conversationId] = messages.reduce(
        (acc, message, i) => {
          // Check if the number of messages exceeds the batch size
          if (i + 1 > BATCH_SIZE) {
            formattedConversations[conversationId].hasInitialNextPage = true;
            return acc;
          }

          const { senderId, ...otherFields } = message.dataValues;

          // Initialize message counters for delivery and read status
          let deliverCount = 0;
          let seenCount = 0;
          let formattedStatus = {};

          // Process message status if sent by the current user
          if (senderId === currentUserId) {
            formattedStatus = otherFields.status.reduce((acc, userStatus) => {
              const { deliverAt, seenAt, profile } = userStatus.dataValues;

              // Update delivery and read counters based on message status
              if (!!deliverAt) deliverCount += 1;
              if (!!seenAt) seenCount += 1;

              acc[profile.userId] = { ...userStatus.dataValues };
              return acc;
            }, {});
          }

          // Add message to the list of messages for the conversation
          acc.messages.push({
            ...otherFields,
            ...(senderId === currentUserId
              ? { status: formattedStatus, deliverCount, seenCount }
              : {})
          });

          return acc;
        },
        {
          messages: [], // Initialize the list of messages
          unseenMessagesCount: parseInt(unseenMessagesCount) // Convert unseen messages count to integer
        }
      );
    }

    // Return the formatted conversations and grouped messages
    return {
      status: successJson.status.ok,
      conversations: formattedConversations,
      groupedMessages
    };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Fetches details of a specific conversation including its members.
 * 
 * @param {string} conversationId - The ID of the conversation to fetch.
 * @param {string} currentUserId - The ID of the current user.
 * @returns {Promise<{ status: string, conversation: Object }> | { error: Error }} 
    A promise resolving to an object containing the fetched conversation details and status, or an error object.
 */
export const fetchConversation = async (conversationId, currentUserId) => {
  try {
    const conversation = await db.Conversation.findByPk(conversationId, {
      include: {
        model: db.Member,
        as: 'members',
        include: {
          model: db.User,
          as: 'profile',
          attributes: ['userId', 'username', 'image']
        }
      }
    });

    const {
      name,
      image,
      isGroup,
      members,
      createdBy,
      createdAt,
      lastMessageAt
    } = conversation.dataValues;

    // Determine the other member or members (depending on group or one-to-one conversation)
    const otherMemberOrMembers = isGroup
      ? members.filter((member) => member.userId !== currentUserId)
      : members.find((member) => member.userId !== currentUserId);

    const formattedConversation = {
      conversationId,
      createdBy,
      createdAt,
      lastMessageAt,
      isGroup,
      image,
      name,
      members,
      ...(isGroup
        ? {
            otherMembers: otherMemberOrMembers,
            adminIds: members.reduce((acc, member) => {
              if (member.isAdmin) acc.push(member.userId);
              return acc;
            }, [])
          }
        : { otherMember: otherMemberOrMembers }),
      hasInitialNextPage: false
    };

    return {
      status: successJson.status.ok,
      conversation: formattedConversation
    };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches messages of a conversation based on the provided conversation ID, current user ID, pagination, and join timestamp.
 * 
 * @param {string} conversationId - The ID of the conversation to fetch messages from.
 * @param {string} currentUserId - The ID of the current user.
 * @param {number} page - The page number for pagination.
 * @param {Date} joinedAt - The timestamp indicating when the current user joined the conversation.
 * @returns {Promise<{ status: string, hasNextPage: boolean, items: Array<Object> }> | { error: Error }} 
    A promise resolving to an object containing fetched messages, pagination information, and status, or an error object.
 */
export const fetchMessages = async (
  conversationId,
  currentUserId,
  page,
  joinedAt
) => {
  const BATCH_SIZE = 20;
  try {
    if (!conversationId || !page || !joinedAt) {
      throw new MissingSystemDataError('FETCH_MESSAGES', {
        conversationId,
        page,
        joinedAt
      });
    }

    // Fetch messages from the database based on conversation ID and pagination
    const messages = await db.Message.findAll({
      where: { conversationId, sentAt: { [Op.gt]: joinedAt } },
      offset: page,
      limit: BATCH_SIZE + 1, // Fetch a batch of 20 messages for pagination
      include: [
        {
          model: db.MessageStatus,
          as: 'status',
          attributes: ['deliverAt', 'seenAt'],
          include: {
            model: db.User,
            as: 'profile',
            attributes: ['userId', 'username', 'image']
          }
        },
        {
          model: db.User,
          as: 'sender',
          attributes: ['userId', 'username', 'image']
        }
      ],
      order: [['sentAt', 'DESC']], // Order messages by sentAt timestamp in descending order
      paranoid: false // Include soft-deleted messages
    });

    // Check if there are more messages to load
    let hasNextPage = false;
    if (messages.length > BATCH_SIZE) {
      hasNextPage = true;
      messages.pop(); // Remove the extra message used to determine hasNextPage
    }

    // Format fetched messages
    const formattedMessages = messages.map((message) => {
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

      // Process message status if sent by the current user
      if (senderId === currentUserId) {
        status = status.reduce((acc, userStatus) => {
          const { deliverAt, seenAt, profile } = userStatus.dataValues;
          console.log(userStatus);
          if (deliverAt) deliverCount += 1;
          if (seenAt) seenCount += 1;

          acc[profile.userId] = { ...userStatus.dataValues };

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
          ? { status, deliverCount, seenCount } // Include delivery and seen count for messages sent by the current user
          : {})
      };
    });

    // Return fetched messages and pagination information
    return {
      status: successJson.status.ok,
      hasNextPage,
      items: formattedMessages
    };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Uploads a group image for a conversation.
 *
 * @param {string} conversationId - The ID of the conversation for which the image is uploaded.
 * @param {string} currentUserId - The ID of the current user performing the operation.
 * @param {string} path - The file path of the image to upload.
 * @returns {Promise<{ status: string }> | { error: Error }} A promise resolving to an object containing the status of the operation, or an error object.
 */
export const uploadGroupImage = async (conversationId, currentUserId, path) => {
  try {
    if (!conversationId || !path) {
      throw new MissingSystemDataError('UPLOAD_GROUP_IMAGE', {
        conversationId
      });
    }

    // Upload the image to a storage service and retrieve the secure URL
    const { secure_url, error } = await uploader(path, 'images');

    // Handle any errors that occur during the upload process
    if (error) {
      // Update the conversation's image field to null if the upload fails
      await db.Conversation.update(
        { image: null },
        { where: { conversationId } }
      );
      // Emit a socket event to notify clients about the failed upload
      io.to(conversationId).emit('upload_fail', {
        key: 'conversationId',
        value: conversationId,
        publisherId: currentUserId
      });
      return { error };
    }

    // Update the conversation's image field with the secure URL
    await db.Conversation.update(
      { image: secure_url },
      { where: { conversationId } }
    );

    // Emit a socket event to update conversation data with the new image URL
    io.to(conversationId).emit('update_conversation', {
      conversationId,
      field: 'image',
      data: { image: secure_url }
    });

    // Return the status of the operation
    return { status: successJson.status.ok };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Updates the name of a conversation.
 * 
 * @param {string} conversationId - The ID of the conversation to update.
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} name - The new name for the conversation.
 * @returns {Promise<{ status: string }> | { error: Error }} 
    A promise resolving to an object containing the status of the update operation, or an error object.
 */
export const setNewName = async (conversationId, currentUserId, name) => {
  try {
    if (!conversationId) {
      throw new MissingSystemDataError('SET_NEW_NAME', { conversationId });
    }

    const isUpdated = await db.Conversation.update(
      {
        name: name
      },
      { where: { conversationId } }
    );

    // Check if the conversation name was successfully updated
    if (!!isUpdated[0]) {
      io.to(conversationId).except(currentUserId).emit('update_conversation', {
        conversationId,
        field: 'name',
        data: { name }
      });
    }

    return { status: successJson.status.ok };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Adds new members to a conversation.
 *
 * @param {string} conversationId - The ID of the conversation to add members to.
 * @param {string} currentUserId - The ID of the current user performing the operation.
 * @param {Array<string>} memberIds - An array containing the IDs of the new members to add.
 * @returns {Promise<{ status: string, newMembers: Array<Object> }> | { error: Error }} A promise resolving to an object containing the status of the operation and the details of the new members added, or an error object.
 */
export const setNewMembers = async (
  conversationId,
  currentUserId,
  memberIds
) => {
  try {
    if (!conversationId) {
      throw new MissingSystemDataError('SET_NEW_MEMBERS', { conversationId });
    }

    // Fetch the conversation details including its current members
    const conversation = await db.Conversation.findByPk(conversationId, {
      include: [
        {
          model: db.Member,
          as: 'members',
          include: {
            model: db.User,
            as: 'profile',
            attributes: ['userId', 'username', 'image']
          }
        }
      ]
    });

    // Add new members to the conversation
    await conversation.addUsers(memberIds);

    // Fetch profiles of the newly added members
    const newMembersProfile = await db.Member.findAll({
      where: { conversationId, userId: { [Op.in]: memberIds } },
      include: {
        model: db.User,
        as: 'profile',
        attributes: ['userId', 'username', 'image']
      }
    });

    // Emit an event to notify existing conversation members about the addition of new members
    io.to(conversationId)
      .except(currentUserId)
      .emit('update_conversation', {
        conversationId,
        field: 'members',
        action: 'addMembers',
        data: { members: newMembersProfile }
      });

    // Join the conversation room for each new member
    memberIds.forEach((userId) => {
      const socket = io.sockets.sockets.get(userId);
      if (socket) socket.join(conversationId);
      redisClient.del(`user_data:${userId}`);
    });

    // Retrieve admin IDs for the conversation
    const adminIds = conversation.dataValues.members.reduce((acc, member) => {
      if (member.isAdmin) acc.push(member.userId);
      return acc;
    }, []);

    // Emit an event to notify the new members about the new group chat
    io.to(memberIds).emit('new_group_chat', {
      conversation: {
        ...conversation.dataValues,
        members: [...conversation.dataValues.members, ...newMembersProfile],
        adminIds,
        hasInitialNextPage: false
      }
    });

    // Return the status of the operation and the details of the new members added
    return {
      status: successJson.status.created,
      newMembers: newMembersProfile
    };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Deletes a member from a conversation.
 *
 * @param {string} conversationId - The ID of the conversation from which to delete the member.
 * @param {string} currentUserId - The ID of the current user performing the operation.
 * @param {string} memberId - The ID of the member to delete from the conversation.
 * @returns {Promise<{ status: string }> | { error: Error }} A promise resolving to an object containing the status of the operation, or an error object.
 */
export const deleteMember = async (conversationId, currentUserId, memberId) => {
  try {
    if (!conversationId || !memberId) {
      throw new MissingSystemDataError('DELETE_MEMBER', { conversationId });
    }

    // Delete the specified member from the conversation
    await db.Member.destroy({
      where: { conversationId, userId: memberId }
    });

    // Emit an event to notify the deleted member about the removal from the conversation
    if (currentUserId !== memberId)
      io.to(memberId).emit('remove_conversation', { conversationId });

    // Leave the conversation room
    const socket = io.sockets.sockets.get(memberId);
    if (socket) socket.leave(conversationId);

    // Clear user data cache
    await redisClient.del(`user_data:${memberId}`);

    // Emit an event to notify other conversation members about the removed member
    io.to(conversationId)
      .except([currentUserId, memberId])
      .emit('update_conversation', {
        conversationId,
        field: 'members',
        action: 'removeMember',
        data: { memberId }
      });

    // Return the status of the operation
    return { status: successJson.status.no_content };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Sets the admin status of a member in a conversation.
 *
 * @param {string} conversationId - The ID of the conversation where the admin status will be set.
 * @param {string} currentUserId - The ID of the current user performing the operation.
 * @param {string} setStatus - The action to perform: 'promote' to promote to admin, 'demote' to demote from admin.
 * @param {string} memberId - The ID of the member whose admin status will be changed.
 * @returns {Promise<{ status: string }> | { error: Error }} A promise resolving to an object containing the status of the operation, or an error object.
 */
export const setAdminStatus = async (
  conversationId,
  currentUserId,
  setStatus,
  memberId
) => {
  try {
    if (!conversationId) {
      throw new MissingSystemDataError('SET_ADMIN_STATUS', {
        conversationId,
        setStatus,
        memberId
      });
    }

    // Update the admin status of the specified member in the conversation
    await db.Member.update(
      { isAdmin: setStatus === 'promote' ? true : false },
      { where: { conversationId, userId: memberId } }
    );

    // Emit an event to notify other conversation members about the admin status change
    io.to(conversationId).except(currentUserId).emit('update_conversation', {
      conversationId,
      field: 'adminIds',
      action: setStatus,
      data: { memberId }
    });

    // Return the status of the operation
    return { status: successJson.status.ok };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Deletes a group conversation.
 *
 * @param {string} conversationId - The ID of the conversation to delete.
 * @param {string} currentUserId - The ID of the current user performing the operation.
 * @returns {Promise<{ status: string }> | { error: Error }} A promise resolving to an object containing the status of the operation, or an error object.
 */
export const deleteConversation = async (conversationId, currentUserId) => {
  try {
    if (!conversationId) {
      throw new MissingSystemDataError('DELETE_CONVERSATION', {
        conversationId
      });
    }

    // Find the conversation by its ID and include its members
    const conversation = await db.Conversation.findByPk(conversationId, {
      include: ['members']
    });

    // Delete the conversation from the database
    await conversation.destroy();

    // Notify each member of the deleted conversation and remove them from the conversation room
    conversation.dataValues.members.forEach((member) => {
      const socket = io.sockets.sockets.get(member.userId);

      if (socket && member.userId !== currentUserId) {
        // Emit event to notify the member about the deletion and leave the conversation room
        io.to(member.userId).emit('remove_conversation', { conversationId });
        socket.leave(conversationId);
      }

      // Clear user data cache
      redisClient.del(`user_data:${member.userId}`);
    });

    // Return the status of the operation
    return { status: successJson.status.no_content };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Removes a conversation from the current user's view.
 *
 * @param {string} conversationId - The ID of the conversation to remove.
 * @param {string} currentUserId - The ID of the current user performing the operation.
 * @returns {Promise<{ status: string }> | { error: Error }} A promise resolving to an object containing the status of the operation, or an error object.
 */
export const removeConversation = async (conversationId, currentUserId) => {
  try {
    if (!conversationId) {
      throw new MissingSystemDataError('REMOVE_CONVERSATION', {
        conversationId
      });
    }

    // Find the conversation by its ID and include its members
    const conversation = await db.Conversation.findByPk(conversationId, {
      include: ['members']
    });

    // Update the joinedAt timestamp for the current user to the last message timestamp
    await db.Member.update(
      { joinedAt: conversation.dataValues.lastMessageAt },
      { where: { conversationId, userId: currentUserId } }
    );

    // Find the other member in the conversation
    const otherMember = conversation.dataValues.members.find(
      (member) => member.userId !== currentUserId
    );

    // Update conversation details to reflect the other member as the creator and remove the last message timestamp
    conversation.lastMessageAt = null;
    conversation.createdBy = otherMember.userId;
    await conversation.save();

    // Return the status of the operation
    return { status: successJson.status.ok };
  } catch (err) {
    // Handle any errors that occur during the execution
    return { error: err };
  }
};
