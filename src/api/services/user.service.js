import db from '../models/index.js';
import successMessages from '../../config/success.json' assert { type: 'json' };

const User = db.User;

/**
 * Creates a new user using the user's register credentials.
 * @param {Object} data - Contains the user's data.
 * The object shuld have the following properties:
 * - Firstname
 * - Lastname
 * - Username
 * - Email
 * - Password
 * @returns {Object} An object containing the status code
 *  and message.
 *
 * The object contains the following properties:
 * - status (The status depending on the result of the opperation).
 * - message  (A user-friendly message to be sent to the client).
 * - error (The error object, if any. Can contain information about the error,
 * such as validation errors, constraint errors, or server errors).
 */
const createUser = async (data) => {
  try {
    console.log(data);
    await User.create(data);
    return {
      status: successMessages.create_user.code,
      message: successMessages.create_user.message
    };
  } catch (err) {
    /**
     * Some Sequelize errors include the words "Sequelize" and "Unique" in the error name.
     * This line of code removes those words to make the error name consistent
     * throught the whole program.
     *
     * For example:
     * - SequelizeValidationError --> ValidationError
     * - SequelizeUniqueConstraintError --> ConstraintError
     */
    err.name = err.name.replace('Sequelize', '').replace('Unique', '');

    // Extract the field name. If it is a server error, it will be null instead
    const field = [err.errors[0].path] || null;
    // Error object containing the type and details about the error stored in an array.
    const errObj = { type: err.name, details: [{ path: field, errObj: err }] };

    return { error: errObj };
  }
};

export { createUser };
