import db from '../../models/index.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import {
  SequelizeConstraintError,
  UserNotFoundError,
  VerificationCodeError
} from '../../helpers/ErrorTypes.helper.js';
import { redisClient } from '../../../lib/redis-client.js';

import crypto from 'crypto';
import sequelize from 'sequelize';
import jwt from 'jsonwebtoken';
import mailer from '../../../lib/mailer.js';

/**
 * Adds a new user to the database.
 *
 * @param {object} data - The data of the new user to be added.
 * @returns {Promise<{ status: string, user?: object }> | { error: Error }} A promise resolving to an object containing the status of the operation and the added user data, or an error object.
 */
export const addUser = async (data) => {
  // Start a database transaction
  const t = await db.sequelize.transaction();

  try {
    // Create the new user in the database using a transaction
    const user = await db.User.create(data, { transaction: t });

    const { userId, username, email } = user.dataValues;
    const { failed } = await mailer(
      userId,
      username,
      email,
      'verification_code'
    );

    if (failed) throw failed;

    // Commit the transaction if no errors occur
    await t.commit();

    // Return success status along with the added user data
    return {
      ...successJson.auth.post.register,
      status: successJson.status.created,
      user: user.dataValues
    };
  } catch (err) {
    // Rollback the transaction if an error occurs
    await t.rollback();

    // Handle unique constraint errors separately using a custom error class
    return {
      error:
        err instanceof sequelize.UniqueConstraintError
          ? new SequelizeConstraintError(err) // Use the custom SequelizeConstraintError class for handling unique constraint errors
          : err // Treat other Sequelize errors as unexpected errors
    };
  }
};

/**
 * Verifies a user's email address using a verification code.
 *
 * @param {string} userId - The ID of the user.
 * @param {string} verificationCode - The verification code sent to the user's email.
 * @returns {Promise<{ message: string, redirect: string, status: string } | { error: Error }>} A promise resolving to an object containing the message, redirect URL, and status of the operation, or an error object.
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
    await db.User.update({ isVerified: true }, { where: { userId } });

    // Return the success message, redirect URL, and status of the operation
    return {
      ...successJson.auth.patch.email,
      status: successJson.status.ok
    };
  } catch (err) {
    // Handle and return any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Checks if a user with the specified field value exists and is verified in the database.
 *
 * @param {string} field - The field to search for (e.g., "email", "username").
 * @param {string} value - The value of the field to search for.
 * @returns {Promise<{ user: User }> | { error: Error }} A promise resolving to an object containing the user object if found and verified, or an error object.
 */
export const checkUserExists = async (field, value) => {
  try {
    // Find the user in the database by specified field
    const user = await db.User.findOne({ where: { [field]: value } });

    // Even if the user exists but the email is not verified, we still generate a user not found error for security reasons
    if (!user || !user.isVerified) throw new UserNotFoundError();

    // Return the user object if it exists and is verified
    return { user };
  } catch (err) {
    // Handle and return any errors that occur during the execution
    return { error: err };
  }
};

/**
 * Sets a new password for the user identified by the provided user ID.
 *
 * @param {string} userId - The unique identifier of the user whose password will be reset.
 * @param {string} newPassword - The new password to be set for the user.
 * @returns {Promise<{ message: string, status: string }> | { error: Error }} A promise resolving to an object containing the success message and status if the password is reset successfully, or an error object.
 */
export const setResetPassword = async (userId, newPassword) => {
  try {
    // Check if the user exists by UserID
    const { user, error } = await checkUserExists('userId', userId);

    if (error) throw error;

    // Set the new password for the user
    user.password = newPassword;
    await user.save();

    // Return success message and status if the password is reset successfully
    return {
      ...successJson.auth.patch.password,
      status: successJson.status.ok
    };
  } catch (err) {
    // Handle and return any errors that occur during the execution
    return { error: err };
  }
};

export default {
  addUser,
  verifyEmail,
  checkUserExists,
  setResetPassword
};
