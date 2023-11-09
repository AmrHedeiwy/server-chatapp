import db from '../../models/index.js';

/**
 * Serializes a user object to a unique identifier for storage in a session cookie.
 *
 * @param {object} user - The user object to be serialized.
 * @param {function} done - The callback function to be called after serialization.
 * @returns {object} The serialized user object.
 */
export const serializeUser = (user, done) => {
  console.log('s');
  done(null, { UserID: user.UserID });
};

/**
 * Deserializes a user object from a unique identifier stored in a session cookie.
 *
 * @param {object} user - The user object to be deserialized.
 * @param {function} done - The callback function to be called after deserialization.
 * @returns {Promise<void>} A Promise that resolves when the deserialization is complete.
 */
export const deserializeUser = async (user, done) => {
  // Find the user in the database using the UserID
  const existingUser = await db.User.findByPk(user.UserID);

  if (existingUser) {
    // Remove the password field from the user object
    delete existingUser.dataValues.Password;

    // Call the "done" callback with the deserialized user
    done(null, existingUser.dataValues);
  } else {
    // Call the "done" callback with false if the user doesn't exist
    done(null, false);
  }
};

export default { serializeUser, deserializeUser };
