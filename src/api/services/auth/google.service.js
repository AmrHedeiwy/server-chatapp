import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-google-oauth2';
import db from '../../models/index.js';
import { SocialMediaAuthenticationError } from '../../helpers/ErrorTypes.helper.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };

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
    callbackURL: 'http://localhost:3000/auth/google/callback'
  },
  async function (request, accessToken, refreshToken, profile, done) {
    // Extract user information from the Google profile object.
    const { id, given_name, family_name, email, email_verified } = profile;

    try {
      // Find or create a new user based on their Google ID.
      const [user, created] = await db.User.findOrCreate({
        where: { GoogleID: id },
        defaults: {
          Firstname: given_name,
          Lastname: family_name,
          Email: email,
          Username: (given_name + family_name).toLowerCase(),
          IsVerified: email_verified
        }
      });

      // If the user is found or created successfully, return the user data and success message.
      if (user) {
        // Remove password field from user data before sending it to the client.
        delete user.dataValues.Password;
        done(null, user.dataValues, {
          message: successJSON.signin_user.message,
          status: successJSON.signin_user.code,
          redirect: successJSON.signin_user.redirect
        });
      } else {
        // If there is an error finding or creating the user, return a SocialMediaAuthenticationError.
        done(new SocialMediaAuthenticationError('Passport Google Error'));
      }
    } catch (err) {
      // If there is an exception thrown during authentication, return a SocialMediaAuthenticationError.
      done(new SocialMediaAuthenticationError(err));
    }
  }
);

export default googleStrategy;
