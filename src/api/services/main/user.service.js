import bcrypt from 'bcrypt';
import sequelize from 'sequelize';
import fs from 'fs';
import crypto from 'crypto';

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
import { io } from '../../../app.js';
import mailer from '../../../lib/mailer.js';

/**
 * Updates the user's profile data and performs additional actions such as caching updated user data and sending email verification if the email is updated.
 *
 * @param {Array<string>} conversationIds - An array of conversation IDs where the user's username change will be broadcasted.
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} currentUsername - The current username of the user.
 * @param {object} data - An object containing the new profile data to be updated.
 * @param {string} [data.username] - The new username.
 * @param {string} [data.email] - The new email address.
 * @returns {Promise<{ message: string, status: string, redirect: string | null }> | { error: Error }} A promise resolving to a success message and status, with an optional redirect URL if email verification is required, or an error object.
 * @throws {SequelizeConstraintError | Error} If a unique constraint error occurs during the database update or unexpected errors happen.
 */
export const saveNewCredentials = async (
  conversationIds,
  currentUserId,
  currentUsername,
  data
) => {
  try {
    await db.User.update(
      { ...data, ...(data.email && { isVerified: false }) },
      { where: { userId: currentUserId } }
    );

    // Cache updated user data
    await redisClient.del(`user_data:${currentUserId}`);

    if (!!data.username) {
      io.to(conversationIds).emit('update_user', {
        userId: currentUserId,
        username: data.username
      });
    }

    if (!!data.email) {
      const { failed } = await mailer(
        currentUserId,
        data.username ?? currentUsername,
        data.email,
        'verification_code'
      );

      if (failed) throw failed;
    }

    return {
      // Success message with an additional notification if email verification is required
      message: successJson.user.put.profile.message,
      status: successJson.status.ok,
      redirect: data.email ? successJson.user.put.profile.redirect : null
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
 * @param {string} userId - The ID of the user whose password will be changed.
 * @param {string} currentPassword - The current password of the user.
 * @param {string} newPassword - The new password to be set.
 * @returns {Promise<{ status: string, message: string, redirect: string }> | { error: Error }} 
    A promise resolving to a success message, status, redirect or an error object.
 * @throws {ChangePasswordError} If the current password does not match the user's existing password.
 */
export const setChangePassword = async (
  userId,
  currentPassword,
  newPassword
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

/**
 * Uploads a new avatar image for the current user and broadcasts the update to specified conversations.
 *
 * @param {string} currentUserId - The ID of the current user.
 * @param {Array<string>} conversationIds - An array of conversation IDs where the user's avatar change will be broadcasted.
 * @param {string} path - The file path of the new avatar image to be uploaded.
 * @returns {Promise<{ image: string, status: string }> | { error: Error }} A promise resolving to the new image URL and status, or an error object if the upload fails.
 */
export const uploadAvatar = async (currentUserId, conversationIds, path) => {
  try {
    // Upload the new avatar image
    const { secure_url, error } = await uploader(path, null, 'image');

    if (error) throw error;

    // Update the user's avatar image URL in the database
    await db.User.update(
      { image: secure_url },
      { where: { userId: currentUserId } }
    );

    // Clear cached user data
    await redisClient.del(`user_data:${currentUserId}`);

    // Broadcast the avatar update to specified conversations
    io.to(conversationIds).emit('update_user', {
      userId: currentUserId,
      image: secure_url
    });

    return { image: secure_url, status: successJson.status.ok };
  } catch (err) {
    return { error: err };
  }
};
