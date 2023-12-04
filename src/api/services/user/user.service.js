import bcrypt from 'bcrypt';
import sequelize, { Op } from 'sequelize';

import successJson from '../../../config/success.json' assert { type: 'json' };
import cloudinary from '../../../config/cloudinary.js';

import db from '../../models/index.js';
import {
  ChangePasswordError,
  DeleteAccountError,
  SequelizeConstraintError,
  UserNotFoundError
} from '../../helpers/ErrorTypes.helper.js';

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

export const fetchUsers = async (curentUserId, curentUsername, query, page) => {
  try {
    const { count, rows: users } = await db.User.findAndCountAll({
      attributes: [
        'UserID',
        'Username',
        'Email',
        'Image',
        'CreatedAt',
        [
          // Column to indicate the follow status of the current user fetching
          db.sequelize.literal(
            `EXISTS (SELECT 1 FROM "follows" WHERE "follows"."FollowedID" = "User"."UserID" AND "follows"."FollowerID" = '${curentUserId}')`
          ),
          'IsFollowingCurrentUser'
        ]
      ],
      where: {
        [Op.and]: [
          { Username: { [Op.iLike]: query + '%' } }, // include everything that starts with query
          { Username: { [Op.ne]: curentUsername } } // exclude the current user fetching
        ]
      },
      offset: page,
      limit: 10, // batch of 10

      include: [
        {
          model: db.User,
          as: 'followers',
          attributes: ['UserID'],
          through: { attributes: [] } // Exclude any additional attributes from the join table
        }
      ]
    });

    return { count, users };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Manages friendship actions such as adding or removing a friend.
 *
 * @param {string} action - The action to perform (add or remove).
 * @param {number} currentUserId - The ID of the current user.
 * @param {number} friendId - The ID of the friend to add or remove.
 * @returns {Promise<Object>} - The result object indicating the success of the action.
 * @throws {Error} - Errors will only be thrown by the database (sequelize) and will mostly be ForeignKeyConstraintError.
 */
export const manageFriendship = async (action, curentUserId, friendId) => {
  if (action !== 'add' && action !== 'remove')
    return res.status(400).json('err');

  try {
    if (action === 'add') {
      await db.Follow.create({
        FollowedID: friendId,
        FollowerID: curentUserId
      });
    }

    if (action === 'remove') {
      await db.Follow.destroy({
        where: {
          FollowedID: friendId,
          FollowerID: curentUserId
        }
      });
    }

    return { isFollowed: action === 'add' ? true : false };
  } catch (err) {
    return {
      error:
        err instanceof sequelize.ForeignKeyConstraintError
          ? new UserNotFoundError()
          : err
    };
  }
};

export default {
  saveNewCredentials,
  setChangePassword,
  deleteAccount,
  fetchUsers,
  manageFriendship
};
