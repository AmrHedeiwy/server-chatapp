import { redisClient } from '../../../config/redis-client.js';
import db from '../../models/index.js';

// Serializes the user object by storing the userId
export const serializeUser = async (userId, done) => {
  done(null, { UserID: userId });
};

// Deserializes the user by retrieving user data from a cache or database
export const deserializeUser = async ({ UserID: userId }, done) => {
  let user;

  try {
    // Attempt to retrieve user data from the cache
    const store = JSON.parse(await redisClient.get(`user_data:${userId}`));

    // console.log(store);
    if (!store) {
      // If user data is not found in the cache, fetch it from the database
      user = (
        await db.User.findByPk(userId, {
          include: {
            model: db.Conversation,
            as: 'Conversations',
            include: {
              model: db.User,
              as: 'Users',
              attributes: ['UserID']
            }
          }
        })
      )?.dataValues;
      delete user.Password; // Remove the password field for security reasons

      user.Rooms = user.Conversations.map((room) => {
        return room.Users.reduce((acc, user) => {
          if (user.UserID != userId) acc.push(user.dataValues.UserID);
          return acc;
        }, [])[0];
      }, []);

      delete user.Conversations;

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
