import { Model } from 'sequelize';

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
      isGroup: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
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
      as: 'users',
      through: models.UserConversation,
      foreignKey: 'conversationId',
      otherKey: 'userId'
    });

    Conversation.hasMany(models.Message, {
      as: 'messages',
      foreignKey: 'conversationId',
      onDelete: 'CASCADE'
    });

    Conversation.hasMany(models.UserConversation, {
      foreignKey: 'conversationId',
      as: 'usersCoversations'
    });
  };

  return Conversation;
};
