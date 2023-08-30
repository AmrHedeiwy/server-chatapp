import db from '../../models/index.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };
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
 * @param {Object} data - The data for the user registration.
 * @returns {Promise<Object>}  A promise that resolves with a user object, or rejects with an error object.
 * @property {Object} user - The user object containing the user's data.
 * @throws {SequelizeErrors} - Sequelize can throw different error classes based on what failed, but it will mostly throw a ConstaintError.
 */
export const addUser = async (data) => {
  // Start a database transaction
  const t = await db.sequelize.transaction();

  try {
    // Create a new user with the provided data, validating the input and using the transaction
    const user = await db.User.create(data, { validate: true, transaction: t });

    // Commit the transaction
    await t.commit();

    // Return the success response with the status, message, redirect URL, and user's email
    return {
      status: successJSON.create_user.code,
      message: successJSON.create_user.message,
      redirect: successJSON.create_user.redirect,
      user
    };
  } catch (err) {
    // Rollback the transaction if an error occurs
    await t.rollback();

    // Return the error response
    return {
      error:
        err instanceof sequelize.UniqueConstraintError
          ? new SequelizeConstraintError(err)
          : err
    };
  }
};

/**
 * Sends a verification code to a user's email address.
 *
 * @param {string} firstname - The first name of the user.
 * @param {string} email - The email address of the user.
 * @returns {Promise<Object>} A promise that resolves with a success message and status, or rejects with an error object.
 * @throws {EmailError} - Thrown when the email fails to send.
 */
export const sendVerificationCode = async (firstname, email) => {
  try {
    // Generate a 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store the verification code in Redis with a TTL of 15 minutes (code expires in 15 minutes)
    await redisClient.setEx(
      `email_verification:${email}`,
      60 * 15,
      JSON.stringify({ verificationCode })
    );

    // Send the verification code via email using the mailerService
    const { message, status, failed } = await mailerService(
      'verification-code',
      firstname,
      email,
      {
        verificationCode
      }
    );

    // Throw an error if the email failed to send
    if (failed) throw failed;

    return { message, status };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Verifies the user's email using the provided verification code.
 *
 * @param {string} email - The email address of the user.
 * @param {string} verificationCode - The verification code provided by the user.
 * @returns {Promise<Object>} A promise that resolves with a success message, status and redirect page, or rejects with an error object.
 * @throws {VerificationCodeError} - Thrown when the verification code is invalid or expired.
 * @throws {UserNotFoundError} - Thrown when the user is not found in the database.
 */
export const verifyEmail = async (email, verificationCode) => {
  try {
    // Retrieve the stored verification code from Redis
    const store = JSON.parse(
      await redisClient.get(`email_verification:${email}`)
    );

    // Throw an error if the stored verification code is not found (expired)
    if (!store) {
      throw new VerificationCodeError('Expired');
    }

    // Throw an error if the provided verification code does not match the stored code (Invalid)
    if (store.verificationCode !== verificationCode) {
      throw new VerificationCodeError('Invalid');
    }

    // Delete the verification code from Redis
    await redisClient.del(`email_verification:${email}`);

    // Update the user's IsVerified status in the database
    const result = await db.User.update(
      { IsVerified: true },
      { where: { Email: email } }
    );

    // Throw an error if the user is not found in the database
    if (result != 1) {
      throw new UserNotFoundError('NotFound');
    }

    return {
      message: successJSON.user_verified.message,
      status: successJSON.user_verified.code,
      redirect: successJSON.user_verified.redirect
    };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Checks if a user exists and is verified by their email address.
 *
 * @param {string} field - The field to look in.
 * @param {string} value - The value to search for.
 * @returns {Promise<Object>} A promise that resolves with the user object, or rejects with an error object.
 * @property {object} user - The user object containing user data if the user exists and is verified.
 * @throws {UserNotFoundError} - Thrown when the user does not exist in the database.
 * @throws {EmailError} - Thrown when the user exists but is not verified.
 */
export const checkUserExists = async (field, value) => {
  try {
    // Find the user in the database by spcified field
    const user = await db.User.findOne({ where: { [field]: value } });

    // Throw an error if the user is not found
    if (!user) throw new UserNotFoundError();

    // Throw an error if the user is not verified
    if (!user.IsVerified) throw new EmailError('NotVerified');

    // Return the user object if it exists and is verified
    return { user };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Sets a new password for a user.
 *
 * @param {number} UserID - The ID of the user.
 * @param {string} newPassword - The new password to set for the user.
 * @returns {Promise<Object>} A promise that resolves with a success message, status and redirect page, or rejects with an error object.
 */
export const setNewPassword = async (userId, newPassword) => {
  try {
    // Check if the user exists by UserID
    const { user, error } = await checkUserExists('UserID', userId);
    if (error) throw error;

    // Set the new password for the user
    user.Password = newPassword;
    await user.save();

    return {
      message: successJSON.change_password.message,
      status: successJSON.change_password.code,
      redirect: successJSON.change_password.redirect
    };
  } catch (err) {
    return { error: err };
  }
};

export default {
  addUser,
  sendVerificationCode,
  verifyEmail,
  checkUserExists,
  setNewPassword
};
