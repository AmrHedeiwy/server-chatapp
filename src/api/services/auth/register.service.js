import jwt from 'jsonwebtoken';
import db from '../../models/index.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };
import { EmailVerificationError } from '../../helpers/ErrorTypes.helper.js';

/**
 * Creates a new user using the user's register credentials.
 *
 * @async
 * @function
 * @param {Object} data - Contains the user's data.
 * The object shuld have the following properties:
 * - Firstname
 * - Lastname
 * - Username
 * - Email
 * - Password
 * @throws {sequelize.ValidationError|sequelize.UniqueConstraintError} If an error occurred during
 * the database transaction, an error object will be returned with error details.
 *
 * @returns {Object}  An object containing the status code, message, redirect if the operation was successful.
 * The object contains the following properties:
 * - status: The status depending on the result of the opperation.
 * - message: A user-friendly message to be sent to the client indicating the result of the operation.
 * - redirect: The URL to redirect to after a successful operation.
 *
 * @returns {Object} An object containing the error details if an error occurred during the transaction.
 * The object contains the following properties:
 * - errors: The error object containing error details.
 */
export const registerUser = async (data) => {
  // Create a transaction.
  const t = await db.sequelize.transaction();

  try {
    // Attempt to save the user to the database.
    await db.User.create(data, { validate: true, transaction: t });

    // Commit the transaction if everything succeeded.
    await t.commit();

    // Return the status code and message to be sent to the client.
    return {
      status: successJSON.create_user.code,
      message: successJSON.create_user.message,
      redirect: successJSON.create_user.redirect
    };
  } catch (err) {
    // Rollback the transaction if anything fails.
    await t.rollback();

    // Return the `err` object containing the error details.
    return { errors: err };
  }
};

/**
 * Verifies an email verification token and updates the user
 * record in the database.
 *
 * @async
 * @function
 * @param {string} token - The email verification token to verify.
 * @throws {EmailVerificationError} If the email is not found in the database.
 * @returns {void} Returns with no value if the verification is successful.
 */
export const verifyEmail = async (token) => {
  try {
    // Verify the token using the secret.
    const decoded = jwt.verify(token, 'mysec');

    // Find the user in the database using the decoded user ID.
    const user = await db.User.findByPk(decoded.UserID);

    // If the user is not found, throw an EmailVerificationError.
    if (!user) throw new EmailVerificationError('VerificationLink');

    // Set the user's IsVerified flag to true and save the changes to the database
    await user.update({ IsVerified: true });

    // Return no value to indicate success
    return;
  } catch (err) {
    // If an error occurs, return an object with an `error` property containing the err object.
    return { error: err };
  }
};

export default {
  registerUser,
  verifyEmail
};
