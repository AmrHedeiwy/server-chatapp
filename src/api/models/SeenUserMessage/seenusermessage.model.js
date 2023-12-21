import { Model } from 'sequelize';

/**
 * Defines the User model.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
   * @class SeenUserMessage
   *
   * Represents the association between a user and a message indicating that the user has seen the message.
   *
   * @property {string} UserID - The unique ID of the user.
   * @property {string} MessageID - The unique ID of the message.
   * @property {Date} CreatedAt - The date and time when the association was created.
   */
  class SeenUserMessage extends Model {}

  SeenUserMessage.init(
    {
      UserID: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      MessageID: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      }
    },
    {
      sequelize,
      modelName: 'SeenUserMessage',
      tableName: 'seenUsersMessages',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['UserID', 'MessageID'],
          name: 'idx_seenusersmessages_unique_user_id_message_id',
          type: 'BTREE'
        }
      ]
    }
  );

  SeenUserMessage.associate = (models) => {
    SeenUserMessage.belongsTo(models.User, { foreignKey: 'UserID' });
    SeenUserMessage.belongsTo(models.Message, {
      foreignKey: 'MessageID'
    });
  };
  return SeenUserMessage;
};
