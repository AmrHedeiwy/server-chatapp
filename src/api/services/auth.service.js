import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import successMessages from '../../config/success.json' assert { type: 'json' };
import { EmailVerificationError } from '../helpers/BaseError.js';

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
export const createUser = async (data) => {
  try {
    await User.create(data, { validate: true });
    return {
      status: successMessages.create_user.code,
      message: successMessages.create_user.message
    };
  } catch (err) {
    /**
     * Some Sequelize errors include the words "Sequelize" and "Unique" in the error name.
     * This line of code removes those words to keep the error format consistent
     * throught the whole program.
     *
     * For example:
     * - SequelizeValidationError --> ValidationError
     * - SequelizeUniqueConstraintError --> ConstraintError
     */
    err.type = err.name.replace('Sequelize', '').replace('Unique', '');

    return { errors: err };
  }
};

export const verifyEmail = async (token) => {
  try {
    const decoded = jwt.verify(token, 'mysec');

    const user = await User.findByPk(decoded.UserID);
    if (!user) throw new EmailVerificationError('User not found', 'notFound');

    await user.update({ IsVerified: true });
    return;
  } catch (err) {
    return { error: err };
  }
};
