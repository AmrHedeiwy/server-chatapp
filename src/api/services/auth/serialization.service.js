import db from '../../models/index.js';

/**
 * Serializes a user object to a unique identifier for storage in a session cookie.
 *
 * @function
 * @param {Object} user - The user object to serialize.
 * @param {Function} done - The callback function to call with the serialized user object.
 * @returns {void}
 */
export const serializeUser = (user, done) => {
  done(null, { UserID: user.UserID });
};

/**
 * Deserializes a user object from a unique identifier stored in a session cookie.
 *
 * @async
 * @function
 * @param {Object} user - The serialized user object.
 * @param {Function} done - The callback function to call with the deserialized user object.
 * @returns {Promise<object>} A Promise that resolves with the authenticated user object, without the password field.
 */
export const deserializeUser = async (user, done) => {
  // Looks up the user in the database.
  const existingUser = await db.User.findByPk(user.UserID);

  /**
   * If the user exists pass the user object as
   * the second parameter of the callback function.
   *
   * If the user does not exist pass false as
   * the second parameter to the callback function.
   */
  if (existingUser) {
    delete user.Password;
    done(null, user);
  } else done(null, false);
};

export default { serializeUser, deserializeUser };
