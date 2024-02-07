import { Model } from 'sequelize';
import { format } from 'date-fns';

export default (sequelize, DataTypes) => {
  /**
   * @class Conversation
   *
   * @property {string} conversationId - The unique ID of the conversation.
   * @property {string} name - The name of the conversation (optional).
   * @property {boolean} isGroup - Indicates if the conversation is a group or not (optional).
   * @property {Date} createdAt - The date when the conversation was created.
   * @property {string} createdBy - The user ID that created the conversation.
   *   - For group conversations, indicates the admin.
   *   - For single conversations, indicates the user who created the conversation
   *     (if there were no messages in the conversation, indicated with lastMessageAt).
   *
   * @property {Date} lastMessageAt - The date when the last message was sent.
   *   - Used to order the conversations.
   *   - Used to filter conversations if there were no previous messages sent in the conversation
   *     as described by the createdBy field.
   */

  class Conversation extends Model {}

  Conversation.init(
    {
      conversationId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isGroup: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          let date = this.getDataValue('createdAt');

          return !!date && typeof date === 'object'
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Conversation',
      tableName: 'conversations',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['conversationId'],
          name: 'idx_conversation_conversationId',
          type: 'BTREE'
        }
      ]
    }
  );

  Conversation.associate = (models) => {
    Conversation.belongsToMany(models.User, {
      as: 'members',
      through: models.Member,
      foreignKey: 'conversationId',
      otherKey: 'userId'
    });

    Conversation.hasMany(models.Member, {
      foreignKey: 'conversationId'
    });

    Conversation.hasMany(models.Message, {
      as: 'messages',
      foreignKey: 'conversationId',
      onDelete: 'CASCADE'
    });
  };

  return Conversation;
};
