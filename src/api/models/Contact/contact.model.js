import { Model } from 'sequelize';

/**
<<<<<<< HEAD
 * Defines the Contact model.
=======
 * Defines the Conversation model.
>>>>>>> 9201da6286df4449e64f1b919576c15804459b9f
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
<<<<<<< HEAD
   * @class Contact
   *
   * @property {string} ContactID - The unique ID of the contact.
   * @property {string} Username - The contact's username.
   * @property {string} Email - The contact's email.
   * @property {string} Image - The contact's profile image (optional).
=======
   * @class Conversation
   *
   * @property {uuid} ConversationID - The unique ID of the conversation.
   * @property {string} CreatedAt - The date when the conversation was created.
   * @property {string} LastMessageAt - The date when the last message was sent.
   * @property {string} Name - The name of the convesation (optional).
   * @property {string} IsGroup - If the conversation is a group or not (optional).
>>>>>>> 9201da6286df4449e64f1b919576c15804459b9f
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
<<<<<<< HEAD
        type: DataTypes.STRING,
        allowNull: true
=======
        type: DataTypes.STRING
>>>>>>> 9201da6286df4449e64f1b919576c15804459b9f
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
