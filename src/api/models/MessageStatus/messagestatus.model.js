import { Model } from 'sequelize';
import { format } from 'date-fns';

export default (sequelize, DataTypes) => {
  /**
   * @class MessageStatus
   * Represents the association between a user and a message indicating that a message was delivered/seen.
   *
   * @property {string} userId - The unique ID of the user.
   * @property {string} messageId - The unique ID of the message.
   * @property {Date} seenAt - The date when the message was seen by the user.
   * @property {Date} deliverAt - The date when the message was delivered to the user.
   */
  class MessageStatus extends Model {}

  MessageStatus.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      messageId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      seenAt: {
        type: DataTypes.DATE,
        get() {
          let date = this.getDataValue('seenAt');

          return !!date && date instanceof Date
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      },
      deliverAt: {
        type: DataTypes.DATE,
        get() {
          let date = this.getDataValue('deliverAt');

          return !!date && date instanceof Date
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      }
    },
    {
      sequelize,
      modelName: 'MessageStatus',
      tableName: 'messagestatus',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'messageId'],
          name: 'idx_messagestatus_userId_messageId',
          type: 'BTREE'
        }
      ]
    }
  );

  MessageStatus.associate = (models) => {
    MessageStatus.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'profile',
      onDelete: 'CASCADE'
    });
    MessageStatus.belongsTo(models.Message, {
      foreignKey: 'messageId',
      onDelete: 'CASCADE'
    });
  };
  return MessageStatus;
};
