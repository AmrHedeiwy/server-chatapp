// import dotenv from 'dotenv';
// dotenv.config({ path: './src/config/.env' });

import { Strategy } from 'passport-google-oauth2';

import successJson from '../../../config/success.json' assert { type: 'json' };
import db from '../../models/index.js';
import { Op } from 'sequelize';

const googleStrategy = new Strategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/auth/google/callback`
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
      // Find or create a new user based on their Google ID or email
      const [user, created] = await db.User.findOrCreate({
        where: { [Op.or]: [{ googleId: id }, { email }] },
        defaults: {
          googleId: id,
          email,
          username: (given_name + '_' + family_name).toLowerCase(),
          isVerified: true,
          image: picture ?? null
        }
      });

      if (!created && user) {
        user.googleId = id;

        // Set the verification status to true if the provider email is equal to the email stored in the db
        if (!user.isVerified && email === user.email) user.isVerified = true;

        user.save();
      }

      done(null, user.dataValues.userId, {
        status: successJson.status.ok,
        redirect: successJson.auth.post.sign_in['google-redirect']
      });
    } catch (err) {
      done(err);
    }
  }
);

export default googleStrategy;
