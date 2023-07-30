import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import { Strategy } from 'passport-facebook';
import db from '../../models/index.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };

const facebookStrategy = new Strategy(
  {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'first_name', 'last_name', 'email'],
    enableProof: true
  },
  async function (accessToken, refreshToken, profile, cb) {
    const { first_name, last_name, email } = profile._json;

    const [user, created] = await db.User.findOrCreate({
      where: { Email: email },
      defaults: {
        Firstname: first_name,
        Lastname: last_name,
        Username: (first_name + last_name).toLowerCase(),
        IsVerified: true
      }
    });

    if (created) {
      cb(null, user, {
        message: successJSON.signin_user.message,
        status: successJSON.signin_user.code,
        redirect: successJSON.signin_user.redirect
      });
    } else {
      cb(true);
    }
  }
);

export default facebookStrategy;
