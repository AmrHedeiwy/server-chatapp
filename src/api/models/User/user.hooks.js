/**
 * Contains hooks for Sequelize that are executed
  before and after calls to the database are executed.
 * @module hooks
*/

import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import { redisClient } from '../../../config/redis-client.js';
import mailerService from '../../services/auth/mailer.service.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default (User) => {
  User.beforeCreate(async (user) => {
    /**
     * Generates a 4-digit UUID and appends it to the user's username.
     * @example 'Emna#1636'
     */
    const uuidGenerator = String(
      parseInt(uuidv4().replace(/-/g, ''), 16) % 10000
    ).padStart(4, '0');

    user.Username = user.Username + '#' + uuidGenerator;
  });

  User.beforeSave(async (user) => {
    if (user.changed('Email')) {
      // Keep emails lowercase
      user.Email = user.Email.toLowerCase();
    }

    if (user.changed('Password')) {
      const password = user.Password;

      if (password) {
        // Store and hash the plain text password using 12 salt rounds.
        user.Password = await bcrypt.hash(password, 12);
      }
    }
  });

  User.afterCreate(async (user) => {
    // Check if the user was created using a third-party authentication provider (Google or Facebook).
    if (user.GoogleID || user.FacebookID) return;

    // Extract the user's Firstname and Email.
    const { Firstname, Email } = user;

    // Generate a 6-digit verification code.
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store the verification code in Redis with a 1-hour expiration time.
    await redisClient.setEx(
      `email_verification:${Email}`,
      60 * 60,
      JSON.stringify({ verificationCode })
    );

    // Send a verification email to the user.
    const { failed } = await mailerService(
      'verification-code',
      Firstname,
      Email,
      {
        verificationCode
      }
    );

    // Check if sending the email failed.
    if (failed) throw { error: failed };
  });
};
