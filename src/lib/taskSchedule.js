import moment from 'moment';
import db from '../api/models/index.js';
import { Op } from 'sequelize';

/**
 * Deletes unverified user accounts created more than 3 days ago and have never been verified.
 * This scheduled task runs every 24 hours.
 */
export const scheduledTasks = () => {
  /**
   * Deletes unverified user accounts.
   */
  const deleteUnverifiedUsers = async () => {
    // Calculate the timestamp 3 days ago
    const twentyFourHoursAgo = moment().subtract(3, 'days').toDate();

    try {
      // Delete unverified user accounts that meet the specified conditions
      const deletedUsersCount = await db.User.destroy({
        where: {
          createdAt: {
            [Op.lt]: twentyFourHoursAgo // Created more than 3 days ago
          },
          lastVerifiedAt: null // Never been verified
        }
      });

      console.log(`${deletedUsersCount} unverified user accounts deleted.`);
    } catch (error) {
      console.error('Error deleting unverified user accounts:', error);
    }
  };

  // Run the deletion job every 24 hours
  setInterval(deleteUnverifiedUsers, 24 * 60 * 60 * 1000);
};

export default scheduledTasks;
