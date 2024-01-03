import { Op } from 'sequelize';
import db from '../../models/index.js';

/**
 * Fetches users based on a given query.
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} currentUsername - The username of the current user.
 * @param {string} query - The query to search for users.
 * @param {number} page - The page number for pagination.
 * @returns {Promise<{count: number, users: object[]}>} - An object containing the count and list of users.
 */
export const fetchUsers = async (
  currentUserId,
  currentUsername,
  query,
  page
) => {
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
            `EXISTS (SELECT 1 FROM "follows" WHERE "follows"."FollowedID" = "User"."UserID" AND "follows"."FollowerID" = '${currentUserId}')`
          ),
          'IsFollowingCurrentUser'
        ]
      ],
      where: {
        [Op.and]: [
          { Username: { [Op.iLike]: query + '%' } }, // Include everything that starts with the query
          { Username: { [Op.ne]: currentUsername } } // Exclude the current user fetching
        ]
      },
      offset: page,
      limit: 10, // Batch of 10

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

export default { fetchUsers };
