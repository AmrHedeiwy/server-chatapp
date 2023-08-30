import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import sgMail from '@sendgrid/mail';
import { EmailError } from '../../helpers/ErrorTypes.helper.js';
import successJSON from '../../../config/success.json' assert { type: 'json' };

// Configure SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an email to a user with the specified type, recipient details, and options.
 *
 * @param {string} type - The type of email to be sent. Possible values: 'Email', 'Password'.
 * @param {string} Firstname - The first name of the recipient.
 * @param {string} Email - The email address of the recipient.
 * @param {object} options - Additional options for the email.
 * @param {string} options.verificationCode - The verification code for email verification (required when type is 'Email').
 * @param {string} options.useridToken - The user ID token for password reset (required when type is 'Password').
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the result of the operation.
 * @property {string} message - A success message indicating the sending operation was successful.
 * @property {number} status - A success code indicating the status of the sending operation.
 * @property {EmailError} [failed] - A failed object if an error occurred during the sending operation.
 */
const sendEmail = async (type, Firstname, Email, options) => {
  let msg = {
    to: Email,
    from: 'amr.hedeiwy@gmail.com',
    subject: '',
    html: ``
  };

  // Construct the email message based on the type
  if (type == 'verification-code') {
    msg.subject = 'Email Verification Code';
    msg.html = `
      <p>Hello ${Firstname},</p>
      <p>Thank you for registering with our service. To complete the registration process, please enter the following verification code:</p>
      <h1>${options.verificationCode}</h1>
      <p>Please enter this code on the registration page to verify your email address.</p>
      <p>If you did not request this verification code, please ignore this email.</p>
      <p>Best regards,</p>
      <p>Amr Hedeiwy</p>
    `;
  } else if (type == 'reset-password') {
    msg.subject = 'Password Reset Request';
    msg.html = `
      <p>Dear ${Firstname},</p>
      <p>We have received a request to reset your password for your Deiwy account. To proceed with resetting your password, please click the button below:</p>
      <p>
        <a href="http://localhost:3000/reset-password?token=${options.useridToken}" target="_blank" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
      </p>
      <p>If clicking the button above doesn't work, you can copy and paste the following URL into your browser's address bar:</p>
      <p>http://localhost:3000/reset-password.html?token=${options.useridToken}</p>
      <p>If you did not request a password reset, please disregard this email. Your account is secure, and no changes have been made.</p>
      <p>Please note that the password reset link is valid for a limited time, typically within 1 hour. If the link expires, you can request another password reset by visiting the [Forgot Password] page on our website.</p>
      <p>If you have any questions or need further assistance, please don't hesitate to contact our support team at amr.hedeiwy@gmail.com.</p>
      <p>Thank you for using Deiwy.</p>
      <p>Best regards,<br>Hedeiwy<br>Deiwy</p>
    `;
  }

  try {
    // Send the email using the configured email service (e.g., sgMail)
    await sgMail.send(msg);

    return {
      message: successJSON.user_emailed.messages[type],
      status: successJSON.user_emailed.code
    };
  } catch (err) {
    return { failed: new EmailError('FailedToSend', err) };
  }
};

export default sendEmail;
