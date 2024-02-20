import { Op } from 'sequelize';
import db from '../../models/index.js';
import sequelize from 'sequelize';
import { redisClient } from '../../../lib/redis-client.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import { MissingSystemDataError } from '../../helpers/ErrorTypes.helper.js';

/**
 * Fetches contacts based on the provided contact IDs.
 *
 * @param {Array<string>} contactIds - An array of contact IDs to fetch.
 * @returns {Promise<{ status: string, contacts: { [userId: string]: { userId: string, username: string, image: string, createdAt: Date } } } | { error: Error }>} 
    A promise resolving to an object containing fetched contacts or an error object.
 */
export const fetchContacts = async (contactIds) => {
  try {
    const contacts = await db.User.findAll({
      where: { userId: { [Op.in]: contactIds } },
      attributes: ['userId', 'username', 'image', 'createdAt']
    });

    const groupedContacts =
      contacts.length > 0
        ? contacts.reduce((acc, contact) => {
            acc[contact.dataValues.userId] = contact;

            return acc;
          }, {})
        : null;

    return {
      status: successJson.status.ok,
      contacts: groupedContacts
    };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches users based on the provided query and pagination parameters, excluding the current user.
 * 
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} query - The search query to filter users by username.
 * @param {number} page - The page number for pagination.
 * @returns {Promise<{ status: number, hasNextPage: boolean, items: Array<{ userId: string, username: string, image: string, createdAt: Date }> } | { error: Error }>} 
    A promise resolving to an object containing fetched users, pagination info, or an error object.
 * @throws {MissingSystemDataError} If query or page is missing.
 */
export const fetchUsers = async (currentUserId, query, page) => {
  try {
    if (!query || page === undefined) {
      throw new MissingSystemDataError('FETCH_USERS', {
        query,
        page
      });
    }

    const BATCH_SIZE = 10;
    // Find and count all users based on the provided query
    const users = await db.User.findAll({
      attributes: ['userId', 'username', 'image', 'createdAt'],
      where: {
        [Op.and]: [
          { username: { [Op.iLike]: query + '%' } }, // Include everything that starts with the query
          { userId: { [Op.ne]: currentUserId } } // Exclude the current user fetching
        ]
      },
      offset: page,
      limit: BATCH_SIZE + 1 // Fetch one extra record to determine if there are more records available
    });

    let hasNextPage = false;

    if (users.length > BATCH_SIZE) {
      hasNextPage = true;
      users.pop(); // Remove the extra record used for pagination logic
    }

    // Return the total count of users and the fetched users
    return { status: successJson.status.ok, hasNextPage, items: users };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Sets a contact for the current user in the database.
 *
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} contactId - The ID of the contact to be set for the current user.
 * @returns {Promise<{ status: string } | { error: Error }>} A promise resolving to a success object with status or an error object.
 * @throws {MissingSystemDataError} If contactId is missing.
 * @throws {UserNotFoundError} If a foreign key constraint error occurs during database operation.
 */
export const setContact = async (currentUserId, contactId) => {
  try {
    if (!contactId) {
      throw new MissingSystemDataError('SET_CONTACT', { contactId });
    }

    await db.Contact.create({
      contactId,
      addedById: currentUserId
    });

    // Clear user data cache
    await redisClient.del(`user_data:${currentUserId}`);

    return {
      status: successJson.status.created
    };
  } catch (err) {
    return {
      error:
        err instanceof sequelize.ForeignKeyConstraintError
          ? new UserNotFoundError() // Handle foreign key constraint error
          : err // Unexpected errors
    };
  }
};

/**
 * Deletes a contact associated with the current user from the database.
 *
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} contactId - The ID of the contact to be deleted.
 * @returns {Promise<{ status: string } | { error: Error }>} A promise resolving to a success object with status or an error object.
 * @throws {MissingSystemDataError} If contactId is missing.
 * @throws {UserNotFoundError} If a foreign key constraint error occurs during database operation.
 */
export const deleteContact = async (currentUserId, contactId) => {
  try {
    if (!contactId) {
      throw new MissingSystemDataError('DELETE_CONTACT', { contactId });
    }

    await db.Contact.destroy({
      where: {
        contactId,
        addedById: currentUserId
      }
    });

    // Clear user data cache
    await redisClient.del(`user_data:${currentUserId}`);

    return {
      status: successJson.status.no_content
    };
  } catch (err) {
    return {
      error:
        err instanceof sequelize.ForeignKeyConstraintError
          ? new UserNotFoundError() // Handle foreign key constraint error
          : err // Unexpected errors
    };
  }
};
