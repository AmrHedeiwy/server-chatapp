import { Model } from 'sequelize';
import { format } from 'date-fns';

export default (sequelize, DataTypes) => {
  /**
   * @class User
   *
   * @property {string} userId - The unique ID of the user.
   * @property {string} googleId - The Google ID associated with the user (optional).
   * @property {string} facebookId - The Facebook ID associated with the user (optional).
   * @property {string} username - The username of the user. Must be between 3 and 20 letters, digits, underscores, or hyphens.
   * @property {string} email - The email address of the user. Must be unique and in valid email format.
   * @property {string} password - The password of the user. Must be at least 8 characters long and contain at least one uppercase letter,
   * one lowercase letter, one digit, and one special character from the set @$!%?&.
   * @property {string} image - The user's profile image (optional).
   * @property {boolean} isVerified - Indicates if the user's email has been verified. Defaults to false.
   * @property {Date} createdAt - The date when the user registered their account.
   */
  class User extends Model {}

  User.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      facebookId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        get() {
          let date = this.getDataValue('createdAt');

          return !!date && date instanceof Date
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['userId'],
          name: 'idx_user_userId',
          type: 'BTREE'
        },
        {
          unique: true,
          fields: ['email'],
          name: 'idx_user_email',
          type: 'BTREE'
        },
        {
          fields: ['username'],
          name: 'idx_user_username',
          type: 'BTREE'
        }
      ]
    }
  );

  User.associate = (models) => {
    User.belongsToMany(models.Conversation, {
      as: 'conversations',
      through: models.Member,
      foreignKey: 'userId',
      otherKey: 'conversationId'
    });

    User.hasMany(models.Member, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Message, {
      as: 'messages',
      foreignKey: 'senderId',
      onDelete: 'CASCADE'
    });

    User.hasMany(models.MessageStatus, { foreignKey: 'userId' });

    User.belongsToMany(models.Message, {
      through: models.MessageStatus,
      foreignKey: 'userId'
    });

    User.belongsToMany(User, {
      as: 'contacts',
      through: models.Contact,
      foreignKey: 'addedById'
    });

    User.belongsToMany(User, {
      as: 'otherContacts', // the users that have this user added as a contact
      through: models.Contact,
      foreignKey: 'contactId' // this user
    });
  };
  return User;
};
