import { Op } from 'sequelize';
import db from '../../models/index.js';
import sequelize from 'sequelize';
import { redisClient } from '../../../lib/redis-client.js';

export const fetchContacts = async (currentUserId) => {
  try {
    const contacts = await db.Contact.findAll(
      {
        addedBy: { [Op.eq]: currentUserId }
      },

      {
        include: [
          {
            model: db.User,
            as: 'contact'
          }
        ]
      }
    );

    console.log(contacts);
    return { contacts: contacts.length > 0 ? contacts : null };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Fetches users based on the provided query.
 * @param {string} currentUserId - Used to indicate if the fetched users are a contact of the current user.
 * @param {string} currentUsername - To filter out the current user's username from being fetched.
 * @param {string} query - The search query to filter users by username.
 * @param {number} page - The page number for pagination.
 * @returns {Object} Object containing the total count of users and the fetched users.
 *    - {number} count: The total count of users matching the query.
 *    - {Array<Object>} items: The array of user objects matching the query.
 *      Each user object contains the following properties:
 *        - {string} userId: The unique ID of the user.
 *        - {string} username: The username of the user.
 *        - {string} email: The email address of the user.
 *        - {string} image: The image URL of the user.
 *        - {Date} createdAt: The date when the user account was created.
 *        - {boolean} isContact: Indicates whether the user is a contact of the current user.
 */
export const fetchUsers = async (
  currentUserId,
  currentUsername,
  query,
  page
) => {
  try {
    const BATCH_SIZE = 10;
    // Find and count all users based on the provided query
    const users = await db.User.findAll({
      attributes: [
        'userId',
        'username',
        'email',
        'image',
        'createdAt',
        // Include a column to indicate whether the user is a contact of the current user
        [
          db.sequelize.literal(
            `EXISTS (
            SELECT 1 
            FROM "contacts" 
            WHERE "contacts"."contactId" = "User"."userId" 
            AND "contacts"."addedById" = '${currentUserId}')`
          ),
          'isContact'
        ]
      ],
      where: {
        [Op.and]: [
          { username: { [Op.iLike]: query + '%' } }, // Include everything that starts with the query
          { username: { [Op.ne]: currentUsername } } // Exclude the current user fetching
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
    return { hasNextPage, items: users };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Manages contact actions such as adding or removing a contact for a user.
 * @param {string} action - The action to perform. Can be 'add' to add a contact or 'remove' to remove a contact.
 * @param {string} currentUserId - The ID of the user that added or removed a contact.
 * @param {string} contactId - The ID of the contact to add or remove.
 * @returns {Object} Object indicating success or failure of the action.
 *    - {boolean} isContact: Indicates if the contact was added (true) or removed (false).
 *    - {Error} error: An error object if the action failed.
 */
export const manageContact = async (action, currentUserId, contactId) => {
  try {
    // Perform action based on the specified action parameter
    if (action === 'add') {
      await db.Contact.create({
        contactId,
        addedById: currentUserId
      });
    }

    if (action === 'remove') {
      await db.Contact.destroy({
        where: {
          contactId,
          addedById: currentUserId
        }
      });
    }

    // Clear user data cache
    await redisClient.del(`user_data:${currentUserId}`);

    // Return success response
    return { isContact: action === 'add' ? true : false };
  } catch (err) {
    return {
      error:
        err instanceof sequelize.ForeignKeyConstraintError
          ? new UserNotFoundError() // Handle foreign key constraint error
          : err // Unexpected errors
    };
  }
};

export default { fetchUsers, manageContact };
