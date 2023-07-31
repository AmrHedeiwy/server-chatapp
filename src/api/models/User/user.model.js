import { Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Defines the User model.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 * @returns {User} The initalized model.
 */
export default (sequelize, DataTypes) => {
  /**
 * @class User
 * @classdesc A Sequelize model representing a user.
 * @extends Model
 * 
 * @typedef {Object} User
 * @property {UUID} UserID - The unique ID of the user.
 * @property {string} Firstname - The first name of the user. Must be
   between 2 and 30 letters only.
 * @property {string} Lastname - The last name of the user. Must be
   between 2 and 30 letters only.
 * @property {string} Username - The username of the user. Must be 
   between 3 and 20 letters, digits, underscores, or hyphens.
 * @property {string} Userkey - The unique key generated for user
   using ../services/hooks.
 * @property {string} Email - The email address of the user. Must be
   unique and in valid email format.
 * @property {string} Password - The password of the user. Must be
   at least 8 characters long and contain at least one uppercase letter,
   one lowercase letter, one digit, and one special character from
   the set @$!%?&.
 */
  class User extends Model {}

  User.init(
    {
      UserID: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        unique: true,
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
      Firstname: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          is: /^[A-Za-z]{2,30}$/
        }
      },
      Lastname: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          is: /^[A-Za-z]{2,30}$/
        }
      },
      Username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          is: /^[A-Za-z\d_-]{3,20}$/
        }
      },
      Email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true,
          isLowercase: true
        }
      },
      Password: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&*]{8,}$/
        }
      },
      IsVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      updatedAt: false
    }
  );

  return User;
};
