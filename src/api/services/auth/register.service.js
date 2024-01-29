import db from '../../models/index.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import {
  EmailError,
  SequelizeConstraintError,
  UserNotFoundError,
  VerificationCodeError
} from '../../helpers/ErrorTypes.helper.js';
import { redisClient } from '../../../config/redis-client.js';
import mailerService from './mailer.service.js';
import crypto from 'crypto';
import sequelize from 'sequelize';

/**
 * Registers a new user.
 *
 * @param {object} data - The data for the user registration.
 * @returns {Promise<{message: string, status: number, redirect: string, user: object}>}
 * @throws {Error} - Errors will only be thrown by the database (sequelize).
 */
export const addUser = async (data) => {
  // Start a database transaction
  const t = await db.sequelize.transaction();

  try {
    // Create the new user to the database using a transaction
    const user = await db.User.create(data, { transaction: t });

    // Commit if no errors
    await t.commit();

    return { ...successJson.register, user: user.dataValues };
  } catch (err) {
    // Rollback the transaction if an error occurs
    await t.rollback();

    return {
      error:
        err instanceof sequelize.UniqueConstraintError
          ? new SequelizeConstraintError(err) // Use the custom SequelizeConstraintError class to be handled accoringly
          : err // The rest of the sequelize errors are treated as unexpected errors
    };
  }
};

/**
 * Sends a verification code to a user's email address.
 *
 * @param {string} username - Used in the email context.
 * @param {string} email - The email address to send the verification code.
 * @returns {Promise<{message: string, status: number, redirect: string}>}
 * @throws {EmailError} - Thrown when the email fails to send.
 */
export const sendVerificationCode = async (username, email, userId) => {
  try {
    // Generate a 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store the verification code in Redis with a TTL of 15 minutes (code expires in 15 minutes)
    await redisClient.setEx(
      `email_verification:${userId}`,
      60 * 15,
      JSON.stringify({ verificationCode })
    );

    // Send the verification code via email using the mailerService
    const { message, redirect, status, failed } = await mailerService(
      'verification-code',
      username,
      email,
      {
        verificationCode
      }
    );

    // Throw an error if the email failed to send
    if (failed) throw failed;

    return { message, redirect, status };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Verifies the user's email using the provided verification code.
 *
 * @param {string} userid - Used as the key when extracting from the cache (redis).
 * @param {string} verificationCode - The verification code provided by the user.
 * @returns {Promise<{message: string, status: number, redirect: string}>}
 * @throws {VerificationCodeError} - Thrown when the verification code is invalid or expired.
 */
export const verifyEmail = async (userId, verificationCode) => {
  try {
    // Retrieve the stored verification code from the cache (redis)
    const store = JSON.parse(
      await redisClient.get(`email_verification:${userId}`)
    );

    // Throw an error if the stored verification code is not found
    if (!store) {
      throw new VerificationCodeError();
    }

    // Throw an error if the provided verification code does not match the stored code
    if (store.verificationCode !== verificationCode) {
      throw new VerificationCodeError();
    }

    // Delete the verification code from the cache (redis)
    await redisClient.del(`email_verification:${userId}`);

    // Invalidate the user data
    await redisClient.del(`user_data:${userId}`);

    // Update the user's IsVerified status and LastVerifiedAt in the database
    await db.User.update(
      { isVerified: true, lastVerifiedAt: Date.now() },
      { where: { userId } }
    );

    return successJson.verified_email;
  } catch (err) {
    return { error: err };
  }
};

/**
 * Checks if a user exists and is verified by their email address.
 *
 * @param {string} field - The field to look in.
 * @param {string} value - The value to search for.
 * @returns {Promise<{user: object}>}
 * @throws {UserNotFoundError} - Thrown when the user is not found in the database.
 * @throws {EmailError} - Thrown when the user account is not verified.
 */
export const checkUserExists = async (field, value) => {
  try {
    // Find the user in the database by spcified field
    const user = await db.User.findOne({ where: { [field]: value } });

    if (!user) throw new UserNotFoundError();

    if (!user.isVerified) throw new EmailError('NotVerified');

    // Return the user object if it exists and is verified
    return { user };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Sets a new password for a user.
 *
 * @param {number} userId - Used to query the user from the database.
 * @param {string} newPassword - The new password to set for the user.
 * @returns {Promise<{message: string, status: number, redirect: string}>}
 */
export const setResetPassword = async (userId, newPassword) => {
  try {
    // Check if the user exists by UserID
    const { user, error } = await checkUserExists('userId', userId);
    if (error) throw error;

    // Set the new password for the user
    user.password = newPassword;
    await user.save();

    return successJson.reset_password;
  } catch (err) {
    return { error: err };
  }
};

export default {
  addUser,
  sendVerificationCode,
  verifyEmail,
  checkUserExists,
  setResetPassword
};
