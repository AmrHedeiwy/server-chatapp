import { Model } from 'sequelize';

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
      body: {
        type: DataTypes.STRING
      },
      image: {
        type: DataTypes.STRING
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'messages',
      timestamps: false
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

    Message.belongsTo(models.User, { foreignKey: 'senderId', as: 'user' });

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
