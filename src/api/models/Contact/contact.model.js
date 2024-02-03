import { Model } from 'sequelize';
import { format } from 'date-fns';

export default (sequelize, DataTypes) => {
  /**
   * @class Contact
   *
   * @property {string} contactId - The unique ID of the added user.
   * @property {string} addedById - The unique ID of the user that added the contact.
   * @property {Date} createdAt - The date when the contact was added.
   */
  class Contact extends Model {}

  Contact.init(
    {
      contactId: {
        type: DataTypes.UUID
      },
      addedById: {
        type: DataTypes.UUID
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        get() {
          let date = this.getDataValue('createdAt');

          return !!date && typeof date === 'object'
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      }
    },
    {
      sequelize,
      modelName: 'Contact',
      tableName: 'contacts',
      timestamps: false,
      indexes: [
        {
          fields: ['contactId'],
          name: 'idx_contact_contactId',
          type: 'BTREE'
        },
        {
          fields: ['addedById'],
          name: 'idx_contact_addedById',
          type: 'BTREE'
        }
      ]
    }
  );

  return Contact;
};
