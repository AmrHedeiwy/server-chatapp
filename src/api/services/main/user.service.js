import bcrypt from 'bcrypt';
import sequelize from 'sequelize';
import fs from 'fs';

import successJson from '../../../config/success.json' assert { type: 'json' };
import cloudinary from '../../../lib/cloudinary.js';
import { redisClient } from '../../../lib/redis-client.js';

import db from '../../models/index.js';
import {
  ChangePasswordError,
  DeleteAccountError,
  SequelizeConstraintError
} from '../../helpers/ErrorTypes.helper.js';
import { uploader } from '../../../lib/uploader.js';

/**
 * Saves new credentials and updates user profile data, including image upload to Cloudinary if provided.
 *
 * @param {Object} data - The data object containing new credentials and profile information.
 * @param {string} data.path - The file path of the image to be uploaded to Cloudinary (if provided).
 * @param {string} data.email - The email address of the user for email verification (optional).
 * @param {Object} currentUser - The current user object.
 * @param {string} currentUser.userId - The ID of the current user.
 * @returns {Promise<{ message: string, status: string, redirect: string, user: Object }> | { error: Error }} A promise resolving to a success message, status, redirect URL (if email verification is required), and updated user object, or an error object.
 * @throws {SequelizeConstraintError} If a unique constraint error occurs during database operation.
 */
export const saveNewCredentials = async (data, currentUser) => {
  try {
    // Upload image file to Cloudinary if FilePath is provided in the data object
    if (data.path) {
      const { secure_url, error } = await uploader(data.path, null, 'image');

      if (error) throw error;
      // Update image URL with secure URL from Cloudinary and remove FilePath from data object
      data.image = secure_url;
      delete data.path;
    }

    const user = await db.User.findOne({
      where: { userId: currentUser.userId }
    });

    const updatedUser = await user.update(data);

    // Remove Password from updatedUser data to not br stored in the cache
    delete updatedUser.dataValues.password;

    // Cache updated user data
    await redisClient.del(`user_data:${currentUser.userId}`);

    return {
      // Success message with an additional notification if email verification is required
      message:
        successJson.user.put.profile.message + data.email
          ? ' Please verify your email.'
          : '',
      status: successJson.status.ok,
      redirect: data.email ? successJson.user.put.profile.redirect : null,
      user: updatedUser // Updated user profile data
    };
  } catch (err) {
    return {
      error:
        err instanceof sequelize.UniqueConstraintError
          ? new SequelizeConstraintError(err) // Handle unique constraint error
          : err // Unexpected errors
    };
  }
};

/**
 * Sets a new password for the user identified by their user ID after validating the current password.
 *
 * @param {string} currentPassword - The current password of the user.
 * @param {string} newPassword - The new password to be set.
 * @param {string} userId - The ID of the user whose password will be changed.
 * @returns {Promise<{ status: string, message: string }> | { error: Error }} A promise resolving to a success message or an error object.
 * @throws {ChangePasswordError} If the current password does not match the user's existing password.
 */
export const setChangePassword = async (
  currentPassword,
  newPassword,
  userId
) => {
  try {
    // Find the user by their ID
    const user = await db.User.findByPk(userId);

    // Compare the provided password with the user's hashed password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) throw new ChangePasswordError();

    // Update the user's password
    user.password = newPassword;
    await user.save();

    return { ...successJson.user.put.password, status: successJson.status.ok };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Deletes a user account from the database and clears associated cached data.
 *
 * @param {string} email - The email address used to validate the deletion request.
 * @param {Object} user - The user object containing user details.
 * @param {string} user.email - The email address of the user.
 * @param {string} user.userId - The ID of the user to be deleted.
 * @returns {Promise<{ status: string, message: string }> | { error: Error }} A promise resolving to a success message or an error object.
 * @throws {DeleteAccountError} If the provided email does not match the user's email.
 */
export const deleteUser = async (email, user) => {
  try {
    // Validate email against user's email
    if (email !== user.email) throw new DeleteAccountError();

    // Delete the user account from the database
    await db.User.delete({ where: { userId: user.userId } });

    // Delete the stored data from the cache
    await redisClient.del(`user_data:${user.userId}`);

    // Return success status and message
    return {
      ...successJson.user.delete.account,
      status: successJson.status.no_content
    };
  } catch (err) {
    // Handle errors
    return { error: err };
  }
};

export default {
  saveNewCredentials,
  setChangePassword,
  deleteUser
};
