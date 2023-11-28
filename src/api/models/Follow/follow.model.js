import { Model } from 'sequelize';

/**
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
   * @class Follow
   *
   * @property {string} FollowedID - The unique ID of the followed user.
   * @property {string} FollowerID - The unique ID of the follower.
   * @property {Date} CreatedAt - The date when the following occured.
   */
  class Follow extends Model {}

  Follow.init(
    {
      FollowedID: {
        type: DataTypes.UUID,
        references: {
          model: 'users',
          key: 'UserID'
        }
      },
      FollowerID: {
        type: DataTypes.UUID,
        references: {
          model: 'users',
          key: 'UserID'
        }
      },
      CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      }
    },
    {
      sequelize,
      modelName: 'Follow',
      tableName: 'follows',
      timestamps: false,
      indexes: [
        {
          fields: ['FollowedID'],
          name: 'idx_follow_followed_id',
          type: 'BTREE'
        },
        {
          fields: ['FollowerID'],
          name: 'idx_follow_follower_id',
          type: 'BTREE'
        }
      ]
    }
  );

  return Follow;
};
