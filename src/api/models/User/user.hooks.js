import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
/**
 * Contains hooks for Sequelize that are executed
  before and after calls to the database are executed.
 * @module hooks
*/
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { EmailError } from '../../helpers/ErrorTypes.helper.js';
import { redisClient } from '../../../config/redisClient.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default (User) => {
  /**
   * Generates a unique username using the user's provided username
   * followed by a 4-digit UUID.
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
   * Converts the user's email to lowercase
   * to keep consistant format.
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
    // Keep emails lowercase
    user.Email = user.Email.toLowerCase();

    // Check if the user changes their password.
    if (user.changed('Password')) {
      const password = user.Password;

      if (password) {
        // Store and hash the plain text password using 12 salt rounds.
        user.Password = await bcrypt.hash(password, 12);
      }
    }
  });

  /**
   * Send email verification link to the user's email.
   *
   * @param {import('../models/users').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} UserID - The user's UserID.
   * @property {string} Firstname - The user's Firstname.
   * @property {string} Email - The user's email.
   */
  User.afterSave(async (user) => {
    // Skip email verification process if the user registers using google or facebook
    if (user.GoogleID || user.FacebookID) return;

    // Extacting the user's UserID, Firstname, Email.
    const { UserID, Firstname, Email } = user;

    // Generate a 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    redisClient.setEx(
      `email_verification:${UserID}`,
      60 * 60,
      JSON.stringify({ email: Email, verificationCode })
    );

    // Custom email message.
    const msg = {
      to: Email,
      from: 'amr.hedeiwy@gmail.com',
      subject: 'Email Verification Code',
      html: `
      <p>Hello ${Firstname},</p>
      <p>Thank you for registering with our service. To complete the registration process, please enter the following verification code:</p>
      <h1>${verificationCode}</h1>
      <p>Please enter this code on the registration page to verify your email address.</p>
      <p>If you did not request this verification code, please ignore this email.</p>
      <p>Best regards,</p>
      <p>Amr Hedeiwy</p>
    `
    };

    // Attempt to send an email to the user's email.
    try {
      await sgMail.send(msg);
    } catch (err) {
      console.error(err);
      // throw a new EmailVericficationError.
      throw new EmailError('FailedToSend', err);
    }
  });
};
