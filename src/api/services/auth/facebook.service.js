import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-facebook';
import db from '../../models/index.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };
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
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'first_name', 'last_name', 'email']
  },
  async function (accessToken, refreshToken, profile, done) {
    console.log(profile);
    // Extract user information from the Facebook profile object.
    const { id, first_name, last_name, email } = profile._json;

    try {
      // Find or create a new user based on their Facebook ID.
      const [user, created] = await db.User.findOrCreate({
        where: { FacebookID: id },
        defaults: {
          Firstname: first_name,
          Lastname: last_name,
          Username: (first_name + '_' + last_name).toLowerCase(),
          Email: email,
          IsVerified: true
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
        done(new SocialMediaAuthenticationError('Passport Facebook Error'));
      }
    } catch (err) {
      // If there is an exception thrown during authentication, return a SocialMediaAuthenticationError.
      done(new SocialMediaAuthenticationError(err));
    }
  }
);

export default facebookStrategy;
