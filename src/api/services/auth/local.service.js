import { Strategy } from 'passport-local';

import successJson from '../../../config/success.json' assert { type: 'json' };
import db from '../../models/index.js';
import { SignInError } from '../../helpers/ErrorTypes.helper.js';

/**
 * An object specifying the custom field names to use for the local authentication strategy.
 */
const customFields = {
  usernameField: 'email',
  passwordField: 'password'
};

const localStrategy = new Strategy(
  customFields,
  /**
   * Authenticates a user with the provided email and password.
   *
   * @param {string} Email
   * @param {string} Password
   * @param {function} done - The callback function to be invoked when authentication is complete.
   * @returns {object} The user's credentials and the success status and redirect URL.
   * @throws {SignInError} - Thrown when the authentication fails due to an incorrect email or password.
   */
  async (email, password, done) => {
    try {
      const user = await db.User.findOne({ where: { email } });

      // If the user does not exist
      if (!user) throw new SignInError();

      // Indicates that the account was registered with a provider
      // if (!user.password) throw new SignInError();

      // Compare the provided password with the user's hashed password
      // const isMatch = await bcrypt.compare(password, user.dataValues.password);

      // Throw an SignInError error if the password does not match
      // if (!isMatch) throw new SignInError();

      return done(null, user.dataValues.userId, {
        status: successJson.sign_in.status,
        redirect: !user.dataValues.isVerified
          ? successJson.sign_in['verify-email-redirect']
          : successJson.sign_in['local-redirect']
      });
    } catch (err) {
      return done(err);
    }
  }
);

export default localStrategy;
