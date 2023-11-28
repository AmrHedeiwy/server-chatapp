/**
 * Contains hooks for Sequelize that are executed
  before and after calls to the database are executed.
 * @module hooks
*/

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
    if (user.changed('Email') && !user.GoogleID && !user.FacebookID) {
      // Keep emails lowercase
      user.Email = user.Email.toLowerCase();
      // Set verification status to false
      user.IsVerified = false;
    }

    if (user.changed('Password')) {
      const password = user.Password;

      if (password) {
        // Store and hash the plain text password using 12 salt rounds.
        user.Password = await bcrypt.hash(password, 12);
      }
    }
  });

  User.afterSave(async (user) => {
    if (user.changed('Email')) {
      const { Username, UserID, Email } = user;

      // Generate a 6-digit verification code.
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      // Store the verification code in Redis with a 1-hour expiration time.
      await redisClient.setEx(
        `email_verification:${UserID}`,
        60 * 60,
        JSON.stringify({ verificationCode })
      );

      // Send the verification code to the email.
      const { failed } = await mailerService(
        'verification-code',
        Username,
        Email,
        {
          verificationCode
        }
      );

      if (failed) throw { error: failed };
    }
  });
};
