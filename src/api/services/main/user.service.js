import bcrypt from 'bcrypt';
import sequelize from 'sequelize';

import successJson from '../../../config/success.json' assert { type: 'json' };
import cloudinary from '../../../config/cloudinary.js';
import { redisClient } from '../../../config/redis-client.js';

import db from '../../models/index.js';
import {
  ChangePasswordError,
  DeleteAccountError,
  SequelizeConstraintError
} from '../../helpers/ErrorTypes.helper.js';

/**
 * Saves new user credentials and updates the user profile.
 * @param {Object} data - Object containing new user credentials and profile data.
 * @param {Object} currentUser - The current user object.
 * @returns {Object} Object containing status and message indicating the success of the operation,
 *                   along with updated user profile data if successful, or an error if failed.
 *    - {string} message: Success message with an additional notification if email verification is required.
 *    - {string} status: Status indicating the success of the operation.
 *    - {string} redirect: Redirect URL after successful operation.
 *    - {Object} user: Updated user profile data.
 * @throws {SequelizeConstraintError} Throws a SequelizeConstraintError if a unique constraint error occurs.
 *    Other Sequelize errors are treated as unexpected errors.
 */
export const saveNewCredentials = async (data, currentUser) => {
  try {
    // Upload image file to Cloudinary if FilePath is provided in the data object
    if (data.filePath) {
      const result = await cloudinary.uploader.upload(data.filePath, {
        format: 'png'
      });

      // Update image URL with secure URL from Cloudinary and remove FilePath from data object
      data.Image = result.secure_url;
      delete data.filePath;
    }

    const user = await db.User.findOne({
      where: { userId: currentUser.userId }
    });

    const updatedUser = await user.update(data);

    // Remove Password from updatedUser data to not br stored in the cache
    delete updatedUser.dataValues.password;

    // Cache updated user data
    await redisClient.setEx(
      `user_data:${updatedUser.userId}`,
      60 * 60 * 24,
      JSON.stringify(updatedUser.dataValues)
    );

    return {
      // Success message with an additional notification if email verification is required
      message: data.email
        ? successJson.update_profile.message + ' Please verify your email.'
        : successJson.update_profile.message,
      status: successJson.update_profile.status,
      redirect: successJson.update_profile.redirect,
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
 * Changes the password for a user.
 * @param {string} currentPassword - The current password of the user.
 * @param {string} newPassword - The new password to set for the user.
 * @param {string} userId - The ID of the user whose password is being changed.
 * @returns {Object} Object indicating success or failure of the password change.
 *    - {string} successJson.change_password: Success message indicating the password change was successful.
 *    - {Error} error: An error object if the password change failed.
 * @throws {ChangePasswordError} Throws a ChangePasswordError if the provided current password does not match the user's current password.
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

    return successJson.change_password;
  } catch (err) {
    return { error: err };
  }
};

/**
 * Deletes a user account from the database.
 * @param {string} email - The email address of the user requesting the account deletion.
 * @param {Object} user - The user object to be deleted from the database.
 * @returns {Object} Object indicating success or failure of the account deletion.
 *    - {string} successJson.delete_account: Success message indicating the account deletion was successful.
 *    - {Error} error: An error object if the account deletion failed.
 * @throws {DeleteAccountError} Throws a DeleteAccountError if the provided email does not match the user's email.
 */
export const deleteUser = async (email, user) => {
  try {
    // Validate email against user's email
    if (email != user.email) throw new DeleteAccountError();

    await db.User.delete({ where: { userId: user.userId } });

    // Delete the stored data from the cache
    await redisClient.del(`user_data:${user.userId}`);

    return successJson.delete_account;
  } catch (err) {
    return { error: err };
  }
};

export default {
  saveNewCredentials,
  setChangePassword,
  deleteUser
};
