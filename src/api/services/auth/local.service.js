/**
 * This module exports a local authentication strategy for Passport authentication library.
 *
 * @module
 */

import db from '../../models/index.js';
import { EmailError, SignInError } from '../../helpers/ErrorTypes.helper.js';
import { Strategy } from 'passport-local';
import bcrypt from 'bcrypt';
import successJson from '../../../config/success.json' assert { type: 'json' };

/**
 * An object specifying the custom field names to use for the local authentication strategy.
 *
 * @type {Object}
 * @property {string} usernameField - The name of the field in the request body that contains the user's email address.
 * @property {string} passwordField - The name of the field in the request body that contains the user's password.
 */
const customFields = {
  usernameField: 'Email',
  passwordField: 'Password'
};

/**
 * Local Strategy for Passport authentication.
 * @constructor
 * @param {object} customFields - The Email and Password fields.
 * @param {function} verifyCallback - The verify callback function that handles authentication and user registration.
 * @returns {object} - A new instance of the Local Strategy.
 */
const localStrategy = new Strategy(
  customFields,
  /**
   * Authenticates a user with the provided email and password.
   *
   * @param {string} Email - The email address of the user.
   * @param {string} Password - The password of the user.
   * @param {function} done - The callback function to be invoked when authentication is complete.
   * @returns {Promise<void>} - A Promise that resolves when authentication is successful or rejects with an error if authentication fails.
   * @throws {SignInError} - Thrown when the authentication fails due to an incorrect email or password.
   */
  async (Email, Password, done) => {
    try {
      // Find the user in the database based on the provided email
      const user = await db.User.findOne({ where: { Email } });

      // Throw an SignInError error if the user does not exist
      if (!user) throw new SignInError('Incorrect email <localstrategy error>');

      // Compare the provided password with the user's hashed password
      const isMatch = await bcrypt.compare(Password, user.dataValues.Password);

      // Throw an SignInError error if the password does not match
      if (!isMatch)
        throw new SignInError('Incorrect password <localstrategy error>');

      // Check if the user's email is verified
      if (!user.IsVerified) throw new EmailError('NotVerified');

      // Remove password field from user data before sending it to the client
      delete user.dataValues.Password;

      // Call the done callback with the authenticated user object and success message, status and redirect page
      return done(null, user.dataValues, {
        status: successJson.signin_user.status,
        redirect: successJson.signin_user.email_redirect
      });
    } catch (err) {
      // Call the done callback with the error if an error occurs during authentication
      return done(err);
    }
  }
);

export default localStrategy;
