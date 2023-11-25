import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-facebook';
import db from '../../models/index.js';
import successJson from '../../../config/success.json' assert { type: 'json' };
import { SocialMediaAuthenticationError } from '../../helpers/ErrorTypes.helper.js';

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
   * @param {object} profile - The user profile obtained from Facebook OAuth.
   * @param {function} done - The callback function to be called when authentication is complete.
   * @returns {object} The user's credentials and the success status and redirect URL.
   */
  async function (accessToken, refreshToken, profile, done) {
    // Extract user information from the Facebook profile object
    const { id, first_name, last_name, email, profileURL } = profile._json;
    console.log(profile);

    try {
      // Find or create a new user based on their Facebook ID
      const [user, created] = await db.User.findOrCreate({
        where: { Email: email },
        defaults: {
          FacebookID: id,
          Username: (first_name + '_' + last_name).toLowerCase(),
          IsVerified: true,
          Image: profileURL ?? null
        }
      });

      // Linking facebook account to the existing user
      if (!created && user) {
        user.FacebookID = id;
        user.IsVerified = true;

        user.save();
      }

      done(null, user.dataValues, {
        status: successJson.sign_in.status,
        redirect: successJson.sign_in['facebook-redirect']
      });
    } catch (err) {
      done(err);
    }
  }
);

export default facebookStrategy;
