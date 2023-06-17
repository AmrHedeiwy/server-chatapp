/**
 * Contains hooks for Sequelize that are executed
  before and after calls to the database are executed.
 * @module hooks
*/
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export default (User) => {
  /**
   * Generates a unique user key based on the user's username
   * and a 4-digit UUID.
   * @example 'Emna#1636'
   *
   * @param {import('../models').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Username - The user's Username.
   * @property {string} Userkey - The user's Userkey.
   */
  User.beforeValidate((user) => {
    const username = user.Username;
    user.Userkey =
      username + '#' + (parseInt(uuidv4().replace('-', ''), 16) % 10000);
  });

  /**
   * Converts the user's email to lowercase
   * to keep consistant format.
   * @example 'example@example.com'
   *
   * @param {import('../models/users').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Email - The user's email.
   */
  User.beforeValidate((user) => {
    if (user.Email) {
      user.Email = user.Email.toLowerCase();
    }
  });

  /**
   * Hashes the users's plain text password using bcrypt.
   *
   * @param {import('../models/users').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Password - The user's password.
   */
  User.beforeCreate(async (user) => {
    const password = user.Password;
    // Store and hash the plain text password using 12 salt rounds
    user.Password = await bcrypt.hash(password, 12);
  });

  /**
   * Send welcome message to the user's email.
   *
   * @param {import('../models/users').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Email - The user's email.
   */
  User.afterCreate((user) => {
    const email = user.Email;
    //  Implement email sending logic here
  });
};
