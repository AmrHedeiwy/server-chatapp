import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-facebook';
import db from '../../models/index.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import { SocialMediaAuthenticationError } from '../../helpers/ErrorTypes.helper.js';

/**
 * Facebook Strategy for Passport authentication.
 * @constructor
 * @param {object} options - The strategy options, including client ID, client secret, callback URL and profile fields.
 * @param {function} verifyCallback - The verify callback function that handles authentication and user registration.
 * @returns {object} - A new instance of the Facebook Strategy.
 */
const facebookStrategy = new Strategy(
  {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:5000/auth/facebook/callback',
    profileFields: ['id', 'first_name', 'last_name', 'email']
  },
  /**
   * Authenticates and handles a user profile obtained from Facebook OAuth.
   *
   * @param {string} accessToken - The access token obtained from Facebook OAuth.
   * @param {string} refreshToken - The refresh token obtained from Facebook OAuth.
   * @param {Object} profile - The user profile obtained from Facebook OAuth.
   * @param {function} done - The callback function to be called when authentication is complete.
   * @returns {Promise<void>} - A promise that resolves when authentication is successful or rejects with an error.
   * @throws {EmailError} - Thrown when the user is not verified.
   * @throws {sequelize.UniqueConstraintError} - If the user already exists BUT without a FacebookID.
   */
  async function (accessToken, refreshToken, profile, done) {
    // Extract user information from the Facebook profile object
    const { id, first_name, last_name, email } = profile._json;

    try {
      // Find or create a new user based on their Facebook ID
      const [user, created] = await db.User.findOrCreate({
        where: { Email: email },
        defaults: {
          FacebookID: id,
          Username: (first_name + '_' + last_name).toLowerCase(),
          IsVerified: true
        }
      });

      if (!created && user) {
        user.FacebookID = id;
        user.IsVerified = true;

        user.save();
      }

      done(null, user.dataValues, {
        status: successJson.signin_user.status,
        redirect: successJson.signin_user.facebook_redirect
      });
    } catch (err) {
      err.provider = 'facebook';
      done(new SocialMediaAuthenticationError(err));
    }
  }
);

export default facebookStrategy;
