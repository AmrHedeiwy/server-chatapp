import { Model } from 'sequelize';

/**
 * Defines the Conversation model.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
   * @class Conversation
   *
   * @property {uuid} ConversationID - The unique ID of the conversation.
   * @property {string} CreatedAt - The date when the conversation was created.
   * @property {string} LastMessageAt - The date when the last message was sent.
   * @property {string} Name - The name of the convesation (optional).
   * @property {string} IsGroup - If the conversation is a group or not (optional).
   */
  class Conversation extends Model {}

  Conversation.init(
    {
      ConversationID: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      LastMessageAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
      },
      Name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      IsGroup: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Conversation',
      tableName: 'conversations',
      createdAt: false,
      updatedAt: false
    }
  );

  Conversation.associate = (models) => {
    Conversation.belongsToMany(models.User, {
      as: 'UserIDs',
      through: 'UserConversations',
      foreignKey: 'ConversationID'
    });

    Conversation.hasMany(models.Message, {
      as: 'MessagesIDs',
      foreignKey: 'ConversationID',
      onDelete: 'CASCADE'
    });
  };

  return Conversation;
};
