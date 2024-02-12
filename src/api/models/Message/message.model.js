import { Model } from 'sequelize';
import { format } from 'date-fns';

export default (sequelize, DataTypes) => {
  /**
   * @class Message
   *
   * @property {string} messageId - The unique ID of the message.
   * @property {string} body - Contains the message content if any.
   * @property {string} image - Contains the image content if any.
   * @property {Date} createdAt - The date when the message was created.
   */
  class Message extends Model {}

  Message.init(
    {
      messageId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT
      },
      fileUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sentAt: {
        type: DataTypes.DATE,
        get() {
          let date = this.getDataValue('sentAt');

          return !!date && typeof date === 'object'
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      },
      updatedAt: {
        type: DataTypes.DATE,
        get() {
          let date = this.getDataValue('updatedAt');

          return !!date && typeof date === 'object'
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          let date = this.getDataValue('deletedAt');

          return !!date ? format(date, 'd MMMM yyyy, h:mm a') : date;
        }
      }
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'messages',
      timestamps: true,
      paranoid: true,
      createdAt: false,
      updatedAt: false,
      deletedAt: 'deletedAt'
    }
  );

  Message.associate = (models) => {
    Message.hasMany(models.MessageStatus, {
      foreignKey: 'messageId',
      as: 'seenStatus'
    });
    Message.hasMany(models.MessageStatus, {
      foreignKey: 'messageId',
      as: 'deliverStatus'
    });

    Message.hasMany(models.MessageStatus, {
      foreignKey: 'messageId',
      as: 'status'
    });

    Message.belongsTo(models.User, { foreignKey: 'senderId', as: 'sender' });

    Message.belongsToMany(models.User, {
      through: models.MessageStatus,
      foreignKey: 'messageId'
    });

    Message.belongsTo(models.Conversation, {
      foreignKey: 'conversationId',
      as: 'conversation'
    });
  };

  return Message;
};
