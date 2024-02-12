import { redisClient } from '../../lib/redis-client.js';
import db from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Initializes the user associated with the socket.
 *
 * This function `initializeUser` sets the `id` property on the socket object to the user ID retrieved
 * from the session stored in the session passport. It also retrieves the user object from either
 * the Redis cache or the database, depending on whether it's cached. Once retrieved, it sets the `user` property on
 * the socket object to the fetched user object. This allows easy access to user information throughout the socket communication process.
 * It also joins the socket to a room with the user ID, enabling targeted communication.
 *
 * @param {object} socket - The socket instance.
 * @param {Function} next - The next function to be called in the middleware chain.
 */
export const initializeUser = async (socket, next) => {
  // Set the socket id to the user ID stored in the session
  socket.id = socket.request.session.passport?.user.userId;

  // Retrieve user object from Redis cache
  let user = JSON.parse(await redisClient.get(`user_data:${socket.id}`));

  // If user object not found in cache, fetch from database
  if (!user) {
    user = (
      await db.User.findByPk(socket.id, {
        attributes: [
          'userId',
          'email',
          'username',
          'image',
          'googleId',
          'facebookId',
          'lastVerifiedAt',
          'createdAt'
        ],
        include: [
          {
            model: db.Conversation,
            as: 'conversations',
            attributes: ['conversationId'],
            include: {
              model: db.User,
              as: 'members',
              attributes: ['userId'],
              where: { userId: { [Op.ne]: socket.id } }
            }
          },
          {
            model: db.User,
            as: 'contacts',
            attributes: ['userId']
          }
        ]
      })
    )?.dataValues;

    // Initialize sockets, conversations, and contacts arrays in the user object
    user.sockets = [];
    user.conversations = [];
    user.contacts = [];

    user.conversations = user.conversations.map((conversation) => {
      if (!conversation.isGroup)
        user.sockets.push(conversation.users[0].userId);
      return conversation.dataValues.conversationId;
    });

    user.contacts = user.contacts.map((contact) => contact.dataValues.userId);

    // Store the fetched user data in the cache for future use
    await redisClient.setEx(
      `user_data:${socket.id}`,
      60 * 60 * 24, // Cache expiration time set to 1 day
      JSON.stringify({ ...user })
    );
  }

  socket.user = user;

  socket.join(socket.id);
  socket.join(socket.user.conversations);

  next();
};

/**
 * Handles the connect event for a socket.
 *
 * This function retrieves the sockets associated with the user from the Redis database,
 * filters them to find the online sockets (active sockets), and emits a 'connected' event
 * to the user's socket with the online sockets to inform about the users online.
 * If online sockets exist, it also emits a 'connected' event to the online sockets with
 * the user's ID to notify the other users that the user is online.
 *
 * @param {object} io - The socket.io instance.
 * @param {object} socket - The socket instance that connected.
 *
 * @returns {Promise<void>} A Promise indicating the completion of the operation.
 */
export const handleConnect = async (io, socket) => {
  const { sockets, conversations, userId } = socket.user;

  const undeliveredMessages = await db.Conversation.findAll({
    where: {
      conversationId: { [Op.in]: conversations },
      '$messages.status.userId$': { [Op.eq]: userId },
      '$messages.status.deliverAt$': { [Op.eq]: null }
    },
    include: [
      {
        model: db.Message,
        as: 'messages',
        include: [
          {
            model: db.MessageStatus,
            as: 'status'
          },
          {
            model: db.User,
            as: 'sender'
          }
        ]
      }
    ],
    order: [[{ model: db.Message, as: 'messages' }, 'sentAt', 'DESC']]
  });

  if (undeliveredMessages.length !== 0)
    io.to(socket.id).emit('undelivered_messages', undeliveredMessages);

  const onlineSockets = sockets.filter((socketId) =>
    io.sockets.adapter.rooms.has(socketId)
  );

  io.to(socket.id).emit('connected', true, onlineSockets);

  if (onlineSockets.length > 0) {
    io.to(onlineSockets).emit('connected', true, [socket.id]);
  }
};

/**
 * Handles the disconnect event for a socket.
 *
 * This function retrieves the sockets that have an existing conversation with the current socket,
 * filters them to find the online sockets (active sockets), and emits a 'connected' event
 * to the online sockets with the user's ID to notify the other users that the user is offline.
 *
 * @param {object} io - The socket.io instance.
 * @param {object} socket - The socket instance that disconnected.
 */
export const handleDisconnect = async (io, socket) => {
  const sockets = socket.user.sockets;

  const onlineSockets = sockets.filter((socketId) =>
    io.sockets.adapter.rooms.has(socketId)
  );

  if (onlineSockets.length > 0) {
    io.to(onlineSockets).emit('connected', false, [socket.id]);
  }
};

/**
 * Handles the reception and processing of a new message received via socket.io.
 * @param {object} socket - The socket object representing the client connection.
 * @param {object} data - The data object containing message details.
 *                        This object should have the following properties:
 *                        - `conversationId`: A string representing the unique identifier of the conversation to which the message belongs.
 *                        - `messageId`: A string representing the unique identifier of the message.
 *                        - `sentAt`: A Date object or a string representing the timestamp when the message was sent.
 *                        - `content`: A string representing the content of the message.
 *                        - `intialMessageStatus`: An object containing initial message status details. This object typically maps user IDs to their corresponding message status. Each key represents a user ID, and the value associated with each key could contain information such as whether the message has been delivered or seen by that user.
 * @param {Function} cb - A callback function to be executed after message handling to notify the sender that the message was recieved by the server.
 */
export const handleMessage = async (socket, data, cb) => {
  const {
    conversationId,
    messageId,
    sentAt,
    content,
    fileUrl,
    intialMessageStatus
  } = data;

  const { userId, username, image, createdAt } = socket.user;

  await db.Message.create(
    {
      conversationId,
      messageId,
      senderId: socket.id,
      sentAt,
      updatedAt: sentAt,
      content: content ?? null,
      fileUrl: fileUrl ?? null,
      status: Object.keys(intialMessageStatus).map((userId) => {
        return { userId };
      })
    },
    {
      include: [
        {
          model: db.MessageStatus,
          as: 'status'
        }
      ]
    }
  );

  await db.Conversation.update(
    { lastMessageAt: sentAt },
    { where: { conversationId } }
  );

  socket.to(conversationId).emit('new_message', {
    conversationId,
    messageId,
    sender: { userId, username, image, createdAt },
    sentAt,
    updatedAt: sentAt,
    ...(!!content && { content }),
    ...(!!fileUrl && { fileUrl })
  });

  cb();
};

/**
 * Handles the update of message status (delivery or seen) received via socket.io.
 * @param {object} socket - The socket object representing the client connection.
 * @param {object} data - The data object containing message status details.
 *                        This object should have one of the following structures:
 *                        1. If updating status for a single message:
 *                            {
 *                              messageId: string, // The unique identifier of the message
 *                              senderId: string, // The sender's ID
 *                              type: string, // The type of status update ('deliver' or 'seen')
 *                              deliverAt?: Date, // (Optional) The timestamp when the message was delivered
 *                              seenAt?: Date // (Optional) The timestamp when the message was seen
 *                            }
 *                        2. If updating status for multiple messages:
 *                            {
 *                              messages: Array<{
 *                                conversationId: string, // The unique identifier of the conversation
 *                                messageId: string, // The unique identifier of the message
 *                                sender: {
 *                                  userId: string // The sender's ID
 *                                }
 *                              }>,
 *                              type: string, // The type of status update ('deliver' or 'seen')
 *                              deliverAt?: Date, // (Optional) The timestamp when the messages were delivered
 *                              seenAt?: Date // (Optional) The timestamp when the messages were seen
 *                            }
 */
export const handleMessageStatus = async (socket, data) => {
  if (data.messageId !== undefined) {
    socket.to(data.senderId).emit('set_status', data, socket.user.userId);
  }

  if (data.messages !== undefined) {
    data.messages.forEach((message) => {
      socket.to(message.sender.userId).emit(
        'set_status',
        {
          conversationId: message.conversationId,
          messageId: message.messageId,
          ...(data.type === 'deliver'
            ? { deliverAt: data.deliverAt }
            : { seenAt: data.seenAt }),
          type: data.type
        },
        socket.user.userId
      );
    });
  }

  await db.MessageStatus.update(
    {
      ...(data.type === 'deliver'
        ? { deliverAt: data.deliverAt }
        : { seenAt: data.seenAt })
    },
    {
      where: {
        userId: socket.user.userId,
        messageId: data.messageId || {
          [Op.in]: data.messages.map((message) => message.messageId)
        }
      }
    }
  );
};

/**
 * Handles the editing of a message received via socket.io.
 * @param {object} socket - The socket object representing the client connection.
 * @param {object} data - The data object containing message edit details.
 *                        This object should have the following properties:
 *                        - `messageId`: A string representing the unique identifier of the message to be edited.
 *                        - `updatedAt`: A Date object or a string representing the updated timestamp of the message.
 *                        - `memberIds`: An array of strings representing the IDs of members involved in the conversation.
 *                        - `content`: A string representing the updated content of the message.
 *                        - `conversationId`: A string representing the unique identifier of the conversation to which the message belongs.
 */
export const handleMessageEdit = async (socket, data) => {
  const { messageId, updatedAt, memberIds, content, conversationId } = data;

  await db.Message.update({ content, updatedAt }, { where: { messageId } });

  socket
    .to(conversationId)
    .emit('update_message', { messageId, content, conversationId });
};

/**
 * Handles the soft deletion of a message received via socket.io.
 * @param {object} socket - The socket object representing the client connection.
 * @param {object} data - The data object containing message soft deletion details.
 *                        This object should have the following properties:
 *                        - `messageId`: A string representing the unique identifier of the message to be soft deleted.
 *                        - `conversationId`: A string representing the unique identifier of the conversation to which the message belongs.
 *                        - `deletedAt`: A Date object or a string representing the timestamp when the message was soft deleted.
 *                        Soft deletion means marking the message as deleted in the database without physically removing it.
 */
export const handleDeleteMessage = async (socket, data) => {
  const { messageId, conversationId, deletedAt } = data;

  await db.Message.destroy({ where: { messageId } });

  socket
    .to(conversationId)
    .emit('remove_message', { messageId, conversationId, deletedAt });
};
