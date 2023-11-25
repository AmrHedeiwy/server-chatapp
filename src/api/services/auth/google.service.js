import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-google-oauth2';
import db from '../../models/index.js';
import { SocialMediaAuthenticationError } from '../../helpers/ErrorTypes.helper.js';
import successJson from '../../../config/success.json' assert { type: 'json' };

const googleStrategy = new Strategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/auth/google/callback'
  },
  /**
   * Authenticates and handles a user profile obtained from Google OAuth.
   *
   * @param {object} request - The request object.
   * @param {string} accessToken - The access token obtained from Google OAuth.
   * @param {string} refreshToken - The refresh token obtained from Google OAuth.
   * @param {object} profile - The user profile obtained from Google OAuth.
   * @param {function} done - The callback function to be called when authentication is complete.
   * @returns {object} The user's credentials and the success status and redirect URL.
   */
  async function (request, accessToken, refreshToken, profile, done) {
    // Extract user information from the Google profile object.
    const { id, given_name, family_name, email, picture } = profile;

    try {
      // Find or create a new user based on their Google ID
      const [user, created] = await db.User.findOrCreate({
        where: { Email: email },
        defaults: {
          GoogleID: id,
          Username: (given_name + '_' + family_name).toLowerCase(),
          IsVerified: true,
          Image: picture ?? null
        }
      });

      if (!created && user) {
        user.GoogleID = id;
        user.IsVerified = true;

        user.save();
      }

      done(null, user.dataValues, {
        status: successJson.sign_in.status,
        redirect: successJson.sign_in['google-redirect']
      });
    } catch (err) {
      done(err);
    }
  }
);

export default googleStrategy;
