// import dotenv from 'dotenv';
// dotenv.config({ path: './src/config/.env' });

import { Strategy } from 'passport-facebook';

import successJson from '../../../config/success.json' assert { type: 'json' };
import db from '../../models/index.js';
import { Op } from 'sequelize';

const facebookStrategy = new Strategy(
  {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${process.env.SERVER_URL}/auth/facebook/callback`,
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

    try {
      // Find or create a new user based on their Facebook ID or email
      const [user, created] = await db.User.findOrCreate({
        where: { [Op.or]: [{ facebookId: id }, { email }] },
        defaults: {
          facebookId: id,
          email,
          username: (first_name + '_' + last_name).toLowerCase(),
          isVerified: true,
          image: profileURL ?? null
        }
      });

      // Linking facebook account to the existing user
      if (!created && user) {
        user.facebookId = id;

        // Set the verification status to true if the provider email is equal to the email stored in the db
        if (!user.isVerified && email === user.email) user.isVerified = true;

        user.save();
      }

      done(null, user.dataValues.userId, {
        status: successJson.status.ok,
        redirect: successJson.auth.post.sign_in['facebook-redirect']
      });
    } catch (err) {
      done(err);
    }
  }
);

export default facebookStrategy;
