import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import successJSON from '../../config/success.json' assert { type: 'json' };
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
 * @returns {Object}  An object containing a status code, message,
 * and error object (if any).
 *
 * The object contains the following properties:
 * - status: The status depending on the result of the opperation.
 * - message: A user-friendly message to be sent to the client indecating
 * the result of the operation.
 * - error: An error object containing details about any
 * errors that occurred during the operation. This property
 * will only be present if an error occurred.
 *
 * If the operation is successful, the `status` and `message` properties
 * will be set using the stored status code and message from `successJSON` file.
 * If an error occurs, only the `error` property will be set to the err object.
 */
export const createUser = async (data) => {
  try {
    await User.create(data, { validate: true });
    return {
      status: successJSON.create_user.code,
      message: successJSON.create_user.message
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

/**
 * Verifies an email verification token and updates the user
 * record in the database.
 *
 * @param {string} token - The email verification token to verify.
 * @returns {void|{error: err}} - Returns with no value if the verification
 * is successful, or returns an object with an `error` property containing
 * the err object if an error occurs.
 */
export const verifyEmail = async (token) => {
  try {
    // Verify the token using the secret.
    const decoded = jwt.verify(token, 'mysec');

    // Find the user in the database using the decoded user ID.
    const user = await User.findByPk(decoded.UserID);

    // If the user is not found, throw an EmailVerificationError.
    if (!user) throw new EmailVerificationError('notFound');

    // Set the user's IsVerified flag to true and save the changes to the database
    await user.update({ IsVerified: true });

    // Return no value to indeicate success
    return;
  } catch (err) {
    // If an error occurs, return an object with an `error` property containing the err object.
    return { error: err };
  }
};
