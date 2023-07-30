import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
/**
 * Contains hooks for Sequelize that are executed
  before and after calls to the database are executed.
 * @module hooks
*/
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { EmailVerificationError } from '../../helpers/ErrorTypes.helper.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default (User) => {
  /**
   * Generates a unique username using the user's provided username
   * followed by a 4-digit UUID.
   * @example 'Emna#1636'
   *
   * @param {import('../models').User} user - The User model instance.
   *
   * The following properties used from the User model:
   * @property {string} Username - The user's Username.
   */
  User.beforeCreate(async (user) => {
    // Generates a 4-digit UUID.
    const uuidGenerator = parseInt(uuidv4().replace('-', ''), 16) % 10000;

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
    // Extacting the user's UserID, Firstname, Email.
    const { UserID, Firstname, Email } = user;

    // Generates a JSON Web Token (JWT) containing the provided user ID.
    const verficationToken = jwt.sign({ UserID }, 'mysec');

    // Custom email message.
    const msg = {
      to: Email,
      from: 'amr.hedeiwy@gmail.com',
      subject: 'Verify your email address',
      html: `<p>Dear ${Firstname},</p>
    <p>Please click the following link to verify your email address:</p>
    <p><a href="${process.env.BASE_URL}/auth/verify-email/${verficationToken}">Verify Email</a></p>
    <p>Regards,</p>
    <p>Deiwy Team</p>`
    };

    // Attempt to send an email to the user's email.
    try {
      await sgMail.send(msg);
    } catch (err) {
      // throw a new EmailVericficationError.
      throw new EmailVerificationError('FailToSendEmailVerification', err);
    }
  });
};
