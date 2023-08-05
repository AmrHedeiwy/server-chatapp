import jwt from 'jsonwebtoken';
import db from '../../models/index.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };
import {
  UserNotFoundError,
  VerificationCodeError
} from '../../helpers/ErrorTypes.helper.js';
import { redisClient } from '../../../config/redisClient.js';

/**
 * Registers a new user with the provided data.
 *
 * @param {Object} data - The user data to be registered.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the registration status, details, and user's email.
 * @throws {Error} - Thrown when an error occurs during the registration process.
 */
export const registerUser = async (data) => {
  // Start a database transaction
  const t = await db.sequelize.transaction();

  try {
    // Create a new user with the provided data, validating the input and using the transaction
    const user = await db.User.create(data, { validate: true, transaction: t });

    // Commit the transaction
    await t.commit();

    // Encrypt the user's ID for security
    const encryptedID = jwt.sign(user.dataValues.UserID, 'mysec');

    // Construct the redirect URL with the encrypted ID
    const redirectURL = `${successJSON.create_user.redirect}?token=${encryptedID}`;

    // Return the success response with the status, message, redirect URL, and user's email
    return {
      status: successJSON.create_user.code,
      message: successJSON.create_user.message,
      redirect: redirectURL,
      // To display the user's email when they are redirected to the email-verification page.
      email: user.dataValues.Email
    };
  } catch (err) {
    console.log(err);
    // Rollback the transaction if an error occurs
    await t.rollback();

    // Return the error response
    return { errors: err };
  }
};

/**
 * Verifies the user's email using the provided verification code.
 *
 * @async
 * @param {string} UserID - The unique identifier of the user.
 * @param {string} VerificationCode - The verification code provided by the user.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the verification status.
 * @throws {VerificationCodeError} - Thrown when the verification code is invalid or expired.
 * @throws {UserNotFoundError} - Thrown when the user is not found in the database.
 */
export const verifyEmail = async (UserID, VerificationCode) => {
  try {
    // Retrieve the stored verification code from Redis
    const store = JSON.parse(
      await redisClient.get(`email_verification:${UserID}`)
    );

    // Throw an error if the stored verification code is not found (expired)
    if (!store) {
      throw new VerificationCodeError('Expired');
    }

    // Throw an error if the provided verification code does not match the stored code
    if (store.verificationCode !== VerificationCode) {
      throw new VerificationCodeError('Invalid');
    }

    // Delete the verification code from Redis
    await redisClient.del(`email_verification:${UserID}`);

    // Update the user's IsVerified status in the database
    const result = await db.User.update(
      { IsVerified: true },
      { where: { UserID } }
    );

    // Throw an error if the user is not found in the database
    if (result != 1) {
      throw new UserNotFoundError('NotFound');
    }

    // Return a success response
    return {
      message: successJSON.user_verified.message,
      status: successJSON.user_verified.code,
      redirect: successJSON.user_verified.redirect
    };
  } catch (err) {
    // Return an error response
    return { error: err };
  }
};

export default {
  registerUser,
  verifyEmail
};
