import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-google-oauth2';
import db from '../../models/index.js';
import {
  EmailError,
  SocialMediaAuthenticationError
} from '../../helpers/ErrorTypes.helper.js';
import successJson from '../../../config/success.json' assert { type: 'json' };

/**
 * Google Strategy for Passport authentication.
 * @constructor
 * @param {object} options - The strategy options, including client ID, client secret, and callback URL.
 * @param {function} verifyCallback - The verify callback function that handles authentication and user registration.
 * @returns {object} - A new instance of the Google Strategy.
 */
const googleStrategy = new Strategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/auth/google/callback'
  },
  /**
   * Authenticates and handles a user profile obtained from Google OAuth.
   *
   * @param {Object} request - The request object.
   * @param {string} accessToken - The access token obtained from Google OAuth.
   * @param {string} refreshToken - The refresh token obtained from Google OAuth.
   * @param {Object} profile - The user profile obtained from Google OAuth.
   * @param {function} done - The callback function to be called when authentication is complete.
   * @returns {Promise<void>} - A promise that resolves when authentication is successful or rejects with an error.
   * @throws {EmailError} - Thrown when the user is not verified.
   * @throws {sequelize.UniqueConstraintError} - If the user already exists BUT without a GoogleID.
   */
  async function (request, accessToken, refreshToken, profile, done) {
    // Extract user information from the Google profile object.
    const { id, given_name, family_name, email } = profile;

    try {
      // Find or create a new user based on their Google ID
      const [user, created] = await db.User.findOrCreate({
        where: { Email: email },
        defaults: {
          GoogleID: id,
          Username: (given_name + '_' + family_name).toLowerCase(),
          IsVerified: true
        }
      });

      if (!created && user) {
        user.GoogleID = id;
        user.IsVerified = true;

        user.save();
      }

      s;
      done(null, user.dataValues, {
        status: successJson.signin_user.status,
        redirect: successJson.signin_user.google_redirect
      });
    } catch (err) {
      err.provider = 'google';
      done(new SocialMediaAuthenticationError(err));
    }
  }
);

export default googleStrategy;
