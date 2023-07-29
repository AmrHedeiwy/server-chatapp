/**
 * This module exports a local authentication strategy for Passport authentication library.
 *
 * @module
 */

import db from '../../models/index.js';
import { AuthenticationError } from '../../helpers/ErrorTypes.helper.js';
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
 * A new instance of the Passport Local Strategy configured with the customFields object.
 *
 * @async
 * @function
 * @param {string} Email - The user's email address.
 * @param {string} Password - The user's password.
 * @param {Function} done - The callback function to call with the authenticated user object.
 * @throws {AuthenticationError} If the user cannot be authenticated.
 * @returns {Promise<object>} A Promise that resolves with the authenticated user object, without the password field.
 */
const localStrategy = new Strategy(customFields, async function (
  Email,
  Password,
  done
) {
  try {
    // Find the user by email in the database
    const user = await db.User.findOne({ where: { Email } });

    // If the user is not found, throw an AuthenticationError
    if (!user) {
      throw new AuthenticationError('Incorrect email <localstrategy error>');
    }

    // Compare the user's hashed password with the plaintext password
    const isMatch = await bcrypt.compare(Password, user.dataValues.Password);

    // If the passwords don't match, throw an AuthenticationError
    if (!isMatch) {
      throw new AuthenticationError('Incorrect password <localstrategy error>');
    }

    // Remove the password field from the user object and pass it to the done() callback with a success message
    delete user.dataValues.Password;
    return done(null, user.dataValues, {
      message: successJSON.login_user.message,
      status: successJSON.login_user.code,
      redirect: successJSON.login_user.redirect
    });
  } catch (err) {
    return done(err);
  }
});

export default localStrategy;
