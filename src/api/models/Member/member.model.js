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
  class Member extends Model {}

  Member.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      conversationId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      joinedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'Member',
      tableName: 'members',
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

  Member.associate = (models) => {
    Member.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'member'
    });
    Member.belongsTo(models.Conversation, {
      foreignKey: 'conversationId',
      as: 'conversation'
    });
  };
  return Member;
};
