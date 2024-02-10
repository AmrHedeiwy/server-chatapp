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
          'isVerified',
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
 * Handles sending and storing messages in a conversation.
 *
 * This function creates a new message, updates the conversation's last message timestamp,
 * and emits the message to the conversation participants.
 *
 * @param {object} socket - The socket instance that initiated the event.
 * @param {object} data - Data containing information required to handle the message.
 * @param {number} data.pageMessagesLength - The number of messages that the user has in their page (since messages are retrieved in batches in the client, each page has a certain number of messages).
 * @param {string} data.conversationId - The ID of the conversation where the message is sent.
 * @param {string} data.messageId - The unique ID of the message.
 * @param {Date} data.createdAt - The timestamp when the message was created.
 * @param {string} data.content - The content of the message.
 * @param {Array<string>} data.userIds - An array of user IDs who are participants in the conversation.
 * @param {Function} cb - A callback function to indicate to the sender that the message was recieved by the server.
 *
 */
export const handleMessage = async (socket, data, cb) => {
  const { conversationId, messageId, sentAt, content, memberIds } = data;

  const { userId, username, image, createdAt } = socket.user;

  await db.Message.create(
    {
      conversationId,
      messageId,
      senderId: socket.id,
      sentAt,
      content,
      status: memberIds.map((userId) => {
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

  socket.to(memberIds).emit('new_message', {
    conversationId,
    messageId,
    sender: { userId, username, image, createdAt },
    sentAt,
    content
  });

  cb();
};

/**
 * Handles setting the "deliver" status of messages.
 *
 * This function updates the "deliver" status of messages based on the provided data.
 *
 * @param {object} socket - The socket instance that initiated the event.
 * @param {object} data - Data containing information required to update the deliver status of message(s).
 * @param {string} data.type - Indicates whether to update the status of one message or multiple messages ('single' or 'batch').
 *   - 'single' means the user was active inside the conversation.
 *   - 'batch' means that the user clicked on a conversation which had undelivered messages, but it does not particularly mean that there is more than one message.
 * @param {Date} data.deliverAt - The date when the message(s) were delivered.
 * @param {string} data.senderId - (Required if type is 'single') The user ID of the sender.
 * @param {string} data.conversationId - (Required if type is 'single') The conversation ID where the message was sent.
 * @param {string} data.messageId - (Required if type is 'single') The unique ID of the message.
 * @param {number} data.pageMessagesLength - (Required if type is 'single') The number of messages that the user has in their page (since messages are retrieved in batches in the client, each page has a certain number of messages).
 * @param {Array<Object>} data.messages - (Required if type is 'batch') The messages to set the deliver status for.
 * @param {string} data.messages[].senderId - The user ID of the sender.
 * @param {string} data.messages[].conversationId - The conversation ID.
 * @param {string} data.messages[].messageId - The unique ID of the message.
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

  console.log({
    ...(data.type === 'deliver'
      ? { deliverAt: data.deliverAt }
      : { seenAt: data.seenAt })
  });
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
