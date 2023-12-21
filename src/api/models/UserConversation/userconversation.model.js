import { Model } from 'sequelize';

/**
 * Defines the User model.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
   * @class UserConversation
   *
   * Represents the association between a user and a conversation they are a part of.
   *
   * @property {string} UserID - The unique ID of the user.
   * @property {string} ConversationID - The unique ID of the conversation.
   * @property {Date} CreatedAt - The date and time when the association was created.
   */
  class UserConversation extends Model {}

  UserConversation.init(
    {
      UserID: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      ConversationID: {
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
      modelName: 'UserConversation',
      tableName: 'usersconversations',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['UserID', 'ConversationID'],
          name: 'idx_usersconversations_unique_user_id_conversation_id',
          type: 'BTREE'
        }
      ]
    }
  );

  UserConversation.associate = (models) => {
    UserConversation.belongsTo(models.User, {
      foreignKey: 'UserID',
      as: 'Users'
    });
    UserConversation.belongsTo(models.Conversation, {
      foreignKey: 'ConversationID',
      as: 'Conversations'
    });
  };
  return UserConversation;
};
