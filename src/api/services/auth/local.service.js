/**
 * This module exports a local authentication strategy for Passport authentication library.
 *
 * @module
 */

import db from '../../models/index.js';
import {
  AuthenticationError,
  EmailVerificationError
} from '../../helpers/ErrorTypes.helper.js';
import { Strategy } from 'passport-local';
import bcrypt from 'bcrypt';
import successJSON from '../../../config/success.json' assert { type: 'json' };

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
const localStrategy = new Strategy(customFields, async function (
  Email,
  Password,
  done
) {
  try {
    // Find the user by their Email in the database.
    const user = await db.User.findOne({ where: { Email } });

    // If the user is not found, throw an AuthenticationError.
    if (!user) {
      throw new AuthenticationError('Incorrect email <localstrategy error>');
    }

    // Compare the user's hashed password with the plaintext password.
    const isMatch = await bcrypt.compare(Password, user.dataValues.Password);

    // If the passwords don't match, throw an AuthenticationError.
    if (!isMatch) {
      throw new AuthenticationError('Incorrect password <localstrategy error>');
    }

    // Check if the user's account is verified.
    if (!user.dataValues.IsVerified) {
      throw new EmailVerificationError('NotVerified');
    }

    // Remove the password field from the user object and pass it to the done() callback with a success message
    delete user.dataValues.Password;
    return done(null, user.dataValues, {
      message: successJSON.signin_user.message,
      status: successJSON.signin_user.code,
      redirect: successJSON.signin_user.redirect
    });
  } catch (err) {
    return done(err);
  }
});

export default localStrategy;
