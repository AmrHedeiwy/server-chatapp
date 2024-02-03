import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import bcrypt from 'bcrypt';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import { redisClient } from '../../../config/redis-client.js';
import mailerService from '../../services/auth/mailer.service.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default (User) => {
  User.beforeSave(async (user) => {
    if (user.changed('email') && !user.googleId && !user.facebookId) {
      // Keep emails lowercase
      user.email = user.email.toLowerCase();
      // Set verification status to false
      user.isVerified = false;
    }

    if (user.changed('password')) {
      const password = user.password;

      if (password) {
        // Store and hash the plain text password using 12 salt rounds.
        user.password = await bcrypt.hash(password, 12);
      }
    }
  });

  User.afterSave(async (user) => {
    if (user.changed('email')) {
      const { username, userId, email } = user;

      // Generate a 6-digit verification code.
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      // Store the verification code in Redis with a 1-hour expiration time.
      await redisClient.setEx(
        `email_verification:${userId}`,
        60 * 60,
        JSON.stringify({ verificationCode })
      );

      // Send the verification code to the email.
      const { failed } = await mailerService(
        'verification-code',
        username,
        email,
        {
          verificationCode
        }
      );

      if (failed) throw { error: failed };
    }
  });
};
