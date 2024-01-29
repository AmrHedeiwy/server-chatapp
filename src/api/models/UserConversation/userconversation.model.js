import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  /**
   * @class UserConversation
   * Represents the association between a user and a conversation.
   *
   * @property {string} userId - The unique ID of the user.
   * @property {string} conversationId - The unique ID of the conversation.
   * @property {Date} createdAt - The date when the user was associated with the conversation.
   */
  class UserConversation extends Model {}

  UserConversation.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      conversationId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      }
    },
    {
      sequelize,
      modelName: 'UserConversation',
      tableName: 'usersconversations',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'conversationId'],
          name: 'idx_usersconversations_userId_conversationId',
          type: 'BTREE'
        }
      ]
    }
  );

  UserConversation.associate = (models) => {
    UserConversation.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'users'
    });
    UserConversation.belongsTo(models.Conversation, {
      foreignKey: 'conversationId',
      as: 'conversations'
    });
  };
  return UserConversation;
};
