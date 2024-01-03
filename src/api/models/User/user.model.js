import { Model } from 'sequelize';

/**
 * Defines the User model.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 */
export default (sequelize, DataTypes) => {
  /**
   * @class User
   *
   * @property {string} UserID - The unique ID of the user.
   * @property {string} Username - The username of the user. Must be between 3 and 20 letters, digits, underscores, or hyphens.
   * @property {string} Email - The email address of the user. Must be unique and in valid email format.
   * @property {string} Password - The password of the user. Must be at least 8 characters long and contain at least one uppercase letter,
   * one lowercase letter, one digit, and one special character from the set @$!%?&.
   * @property {string} GoogleID - The Google ID associated with the user (optional).
   * @property {string} FacebookID - The Facebook ID associated with the user (optional).
   * @property {string} Image - The user's profile image (optional).
   * @property {boolean} IsVerified - Indicates if the user's email has been verified. Defaults to false.
   * @property {Date} LastVerifiedAt - The timestamp of the last email verification. Null if the user has never been verified.
   * @property {Date} CreatedAt - The date when the user registered their account.
   */
  class User extends Model {}

  User.init(
    {
      UserID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      GoogleID: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      FacebookID: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      Username: {
        type: DataTypes.STRING,
        allowNull: false
      },
      Email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      Password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      Image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      IsVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      LastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
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
          fields: ['UserID'],
          name: 'idx_user_unique_user_id',
          type: 'BTREE'
        },
        {
          unique: true,
          fields: ['Email'],
          name: 'idx_user_unique_email',
          type: 'BTREE'
        },
        {
          fields: ['Username'],
          name: 'idx_user_username',
          type: 'BTREE'
        }
      ]
    }
  );

  User.associate = (models) => {
    User.belongsToMany(models.Conversation, {
      as: 'Conversations',
      through: models.UserConversation,
      foreignKey: 'UserID',
      otherKey: 'ConversationID'
    });

    User.hasMany(models.Message, {
      as: 'Messages',
      foreignKey: 'SenderID',
      onDelete: 'CASCADE'
    });

    User.hasMany(models.UserConversation, {
      foreignKey: 'UserID',
      as: 'Rooms'
    });
    User.hasMany(models.SeenUserMessage, { foreignKey: 'UserID' });

    User.belongsToMany(models.Message, {
      as: 'SeenMessages',
      through: models.SeenUserMessage,
      foreignKey: 'UserID'
    });

    User.belongsToMany(User, {
      as: 'following',
      through: models.Follow,
      foreignKey: 'FollowerID'
    });

    User.belongsToMany(User, {
      as: 'followers',
      through: models.Follow,
      foreignKey: 'FollowedID'
    });
  };
  return User;
};
