/**
 * @module serializationService
 *  Serializes/Deserializes a user object to a unique identifier for storage in a session cookie.
 *
 * @function serializeUser
 * @function deserializeUser
 *
 * @param {object} user - The user object to be serialized/deserializes.
 * @param {function} done - The callback function to be called after serialization/deserialization.
 */

import db from '../../models/index.js';

export const serializeUser = (user, done) => {
  done(null, { UserID: user.UserID });
};

export const deserializeUser = async (user, done) => {
  // Find the user in the database using the UserID
  const existingUser = (await db.User.findByPk(user.UserID))?.dataValues;

  if (existingUser) {
    // Call the done() callback with the deserialized user
    done(null, existingUser);
  } else {
    // Call the done() callback with false if the user does not exist
    done(null, false);
  }
};

export default { serializeUser, deserializeUser };
