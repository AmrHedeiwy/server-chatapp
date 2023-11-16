import { Model } from 'sequelize';

/**
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
   * @class Contact
   *
   * @property {string} ContactID - The unique ID of the contact.
   * @property {string} Username - The contact's username.
   * @property {string} Email - The contact's email.
   * @property {string} Image - The contact's profile image (optional).
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
        type: DataTypes.STRING,
        allowNull: true
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
