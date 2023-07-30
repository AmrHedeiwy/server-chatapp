import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-google-oauth2';
import db from '../../models/index.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };

/**
 * A new instance of the Passport Google Strategy.
 *
 * @async
 * @function
 * @returns {Promise<object>} A Promise that resolves with the authenticated user object, without the password field.
 */
const googleStrategy = new Strategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
  },
  async function (request, accessToken, refreshToken, profile, done) {
    const { given_name, family_name, email, email_verified } = profile._json;

    // Attempt to find or create the user.
    const [user, created] = await db.User.findOrCreate({
      where: { Email: email },
      defaults: {
        Firstname: given_name,
        Lastname: family_name,
        Username: (given_name + family_name).toLowerCase(),
        IsVerified: email_verified
      }
    });

    if (created) {
      // Remove the password field from the user object and pass it to the done() callback with a success message
      delete user.dataValues.Password;
      done(null, user.dataValues, {
        message: successJSON.signin_user.message,
        status: successJSON.signin_user.code,
        redirect: successJSON.signin_user.redirect
      });
    } else {
      done(true);
    }
  }
);

export default googleStrategy;
