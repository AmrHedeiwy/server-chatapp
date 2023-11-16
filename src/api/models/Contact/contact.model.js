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
  class Contact extends Model {}

  Contact.init(
    {
      ContactID: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      Username: {
        type: DataTypes.STRING
      },
      Email: {
        type: DataTypes.STRING
      },
      Image: {
        type: DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: 'Contact',
      tableName: 'contacts',
      createdAt: false,
      updatedAt: false
    }
  );

  Contact.associate = (models) => {
    Contact.belongsTo(models.User, {
      foreignKey: 'UserID'
    });
  };

  return Contact;
};
