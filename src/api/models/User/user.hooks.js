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
  /**
   * Generates a 4-digit UUID and appends it to the user's username.
   * @example 'Emna#1636'
   *
   * @param {import('./user.model.js').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Username - The user's Username.
   */
  User.beforeCreate(async (user) => {
    // Generates a 4-digit UUID.
    const uuidGenerator = String(
      parseInt(uuidv4().replace(/-/g, ''), 16) % 10000
    ).padStart(4, '0');

    user.Username = user.Username + '#' + uuidGenerator;
  });

  /**
   * Send email verification code.
   * Hashes the users's plain text password using bcrypt.
   *
   *
   * @param {import('../models/users').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Email - The user's email.
   * @property {string} Password - The user's password.
   */
  User.beforeSave(async (user) => {
    if (user.changed('Email')) {
      if (user.GoogleID || user.FacebookID) return;

      // Keep emails lowercase
      user.Email = user.Email.toLowerCase();

      // Extacting the user's Firstname and Email.
      const { Firstname, Email } = user;

      // Generate a 6-digit verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      await redisClient.setEx(
        `email_verification:${Email}`,
        60 * 60,
        JSON.stringify({ verificationCode })
      );

      const { failed } = await mailerService('Email', Firstname, Email, {
        verificationCode
      });
      if (failed) throw { error: failed };
    }

    if (user.changed('Password')) {
      if (user.GoogleID || user.FacebookID) return;
      const password = user.Password;

      if (password) {
        // Store and hash the plain text password using 12 salt rounds.
        user.Password = await bcrypt.hash(password, 12);
      }
    }
  });
};
