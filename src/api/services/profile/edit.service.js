import sharp from 'sharp';
import db from '../../models/index.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import sequelize from 'sequelize';
import {
  ChangePasswordError,
  SequelizeConstraintError
} from '../../helpers/ErrorTypes.helper.js';
import bcrypt from 'bcrypt';

/**
 * Saves new credentials and updates the user's profile.
 * @param {object} data - The data containing the new credentials and profile information.
 * @param {object} currentUser - The credentials of the current user whose profile is being updated.
 * @returns {Promise<Object>} - A Promise that resolves to an object with the updated user and a success message, or an error object.
 * @throws {SequelizeErrors} - Sequelize can throw different error classes based on what failed, but it will mostly throw a ConstaintError.
 */
export const saveNewCredentials = async (data, currentUser) => {
  try {
    if (data.Buffer) {
      /**
       * Resize and convert the image buffer to PNG format.
       * The original 'Buffer' property is replaced with the resized and converted image buffer.
       */
      data.Image = await sharp(data.Buffer)
        .resize({ width: 250, height: 250 })
        .png()
        .toBuffer();

      delete data.Buffer;
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

    /**
     * Check if the 'data' object has an 'Email' property.
     * If true, append an additional message to notify the user to verify their email.
     */
    return {
      message: data.Email
        ? successJson.update_profile.message + ' Please verify your email.'
        : successJson.update_profile.message,
      status: successJson.update_profile.status,
      redirect: successJson.update_profile.redirect,
      user: updatedUser
    };
  } catch (err) {
    console.log(err);
    return {
      error:
        err instanceof sequelize.UniqueConstraintError
          ? new SequelizeConstraintError(err)
          : err
    };
  }
};

/**
 * Saves a new password and updates the user's profile.
 * @param {string} currentPassword - The user's current password.
 * @param {string} newPassword - The new password to be set.
 * @param {uuid} userId - The ID of the user.
 * @returns {Promise<Object>} - A Promise that resolves to an object with the updated user and a success message, or an error object.
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

export default {
  saveNewCredentials,
  setChangePassword
};
