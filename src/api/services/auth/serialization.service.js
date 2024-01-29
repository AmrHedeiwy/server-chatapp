import { redisClient } from '../../../config/redis-client.js';
import db from '../../models/index.js';
import { Op } from 'sequelize';

// Serializes the user object by storing the userId
export const serializeUser = async (userId, done) => {
  done(null, { userId });
};

// Deserializes the user by retrieving user data from a cache or database
export const deserializeUser = async ({ userId }, done) => {
  let user;

  try {
    // Attempt to retrieve user data from the cache
    const store = JSON.parse(await redisClient.get(`user_data:${userId}`));

    if (!store) {
      // If user data is not found in the cache, fetch it from the database
      user = (
        await db.User.findByPk(userId, {
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
                as: 'users',
                attributes: ['userId'],
                where: { userId: { [Op.ne]: userId } }
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

      user.sockets = [];

      user.conversations = user.conversations.map((conversation) => {
        if (!conversation.isGroup)
          user.sockets.push(conversation.users[0].userId);
        return conversation.dataValues.conversationId;
      });

      user.contacts = user.contacts.map((contact) => contact.dataValues.userId);

      // Store the fetched user data in the cache for future use
      await redisClient.setEx(
        `user_data:${userId}`,
        60 * 60 * 24, // Cache expiration time set to 1 day
        JSON.stringify({ ...user })
      );
    } else {
      // If user data is found in the cache, use it
      user = store;
    }

    if (user) {
      // If user data is available, pass it to the 'done' callback
      done(null, user);
    } else {
      // If user data is not available, indicate failure to the 'done' callback
      done(null, false);
    }
  } catch (err) {
    // If an error occurs during deserialization, log the error and indicate failure to the 'done' callback
    console.log('DESERIALIZATION ERROR', { error: err });
    done(null, false);
  }
};

export default { serializeUser, deserializeUser };
