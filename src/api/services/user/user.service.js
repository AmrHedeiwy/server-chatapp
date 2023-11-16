import db from '../../models/index.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import sequelize from 'sequelize';
import {
  ChangePasswordError,
  DeleteAccountError,
  SequelizeConstraintError
} from '../../helpers/ErrorTypes.helper.js';
import bcrypt from 'bcrypt';

import cloudinary from '../../../config/cloudinary.js';

/**
 * Updates the user's profile.
 *
 * @param {object} data - The data containing the new credentials and profile information.
 * @param {object} currentUser - The credentials of the current user whose profile is being updated.
 * @returns {Promise<Object>} - The success response with the message, status, redirect URL, and the updated user.
 * @throws {Error} - An unexpected error from cloudinary or thrown by the database (sequelize).
 */
export const saveNewCredentials = async (data, currentUser) => {
  try {
    // Uploads an image file to Cloudinary if a file path is provided in the data object.
    if (data.FilePath) {
      const result = await cloudinary.uploader.upload(data.FilePath, {
        format: 'png'
      });

      // Update the image URL with the secure URL from Cloudinary and remove the file path from the data object
      data.Image = result.secure_url;
      delete data.FilePath;
    }

    /**
     * Check if the Username was changed.
     * If so, we concatonate the updated Username with the uuid stored in the user's current Username.
     */
    if (data.Username) {
      const uuid = currentUser.Username.split('#')[1];

      data.Username += `#${uuid}`;
    }

    // Find the user in the database
    const user = await db.User.findOne({
      where: { UserID: currentUser.UserID }
    });

    // Update the user's profile with the new data
    const updatedUser = await user.update(data);

    return {
      /**
       * Check if the 'data' object has an 'Email' property.
       * If true, append an additional message to notify the user to verify their email.
       */
      message: data.Email
        ? successJson.update_profile.message + ' Please verify your email.'
        : successJson.update_profile.message,
      status: successJson.update_profile.status,
      redirect: successJson.update_profile.redirect,
      user: updatedUser
    };
  } catch (err) {
    return {
      error:
        err instanceof sequelize.UniqueConstraintError
          ? new SequelizeConstraintError(err) // Use the custom SequelizeConstraintError class to be handled accoringly
          : err // The rest of the sequelize errors are treated as unexpected errors
    };
  }
};

/**
 * Saves the user's new password
 *
 * @param {string} currentPassword - The user's current password.
 * @param {string} newPassword - The new password to be set.
 * @param {string} userId - Used to query the database.
 * @returns {Promise<object>} - The success response with the message and status.
 * @throws {ChangePasswordError} - If the current password does not match the user's stored password.
 */
export const setChangePassword = async (
  currentPassword,
  newPassword,
  userId
) => {
  try {
    const user = await db.User.findByPk(userId);

    // Compare the provided password with the user's hashed password
    const isMatch = await bcrypt.compare(currentPassword, user.Password);

    if (!isMatch) throw new ChangePasswordError();

    user.Password = newPassword;
    user.save();

    return successJson.change_password;
  } catch (err) {
    return { error: err };
  }
};

/**
 * Checks that the email promted by the user matches to confirm account deletion
 * and removes the user from the database.
 *
 * @param {string} email - The promted email by the user.
 * @param {string} user - The user's crednetials.
 * @returns {Promise<object>} - The success response with the message, status, and the redirect URL.
 * @throws {DeleteAccountError} - If the current password does not match the user's stored password.
 */
export const deleteAccount = async (email, user) => {
  try {
    if (email != user.Email) throw new DeleteAccountError();

    // Deletes the user from the database
    await db.User.delete({ where: { UserID: user.UserID } });

    return successJson.delete_account;
  } catch (err) {
    return { error: err };
  }
};

export default {
  saveNewCredentials,
  setChangePassword,
  deleteAccount
};
