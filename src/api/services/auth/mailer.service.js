import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import sgMail from '@sendgrid/mail';
import { EmailError, MailerError } from '../../helpers/ErrorTypes.helper.js';
import successJson from '../../../config/success.json' assert { type: 'json' };

// Configure SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an email to a user with the specified type, recipient details, and options.
 *
 * @param {string} type - Weather the email is for 'verification-code' or 'forgot-password'.
 * @param {string} Username - Used in the email context.
 * @param {string} Email - The email to send to.
 * @param {object} options - Additional options for the email.
 * @param {string} options.verificationCode - The verification code for email verification (required when type is 'verification-code').
 * @param {string} options.useridToken - The user ID token for password reset (required when type is 'forgot-password').
 * @returns {Promise<Object>} The success response with the message, status and redirect URL if needed.
 * @throws {EmailError} - A failed object if an error occurred during the sending operation.
 */
const mailer = async (type, Username, Email, options) => {
  let msg = {
    to: Email,
    from: 'amr.hedeiwy@gmail.com',
    subject: '',
    html: ``
  };

  // Only extract the name part 'Emna#3123' -> 'Emna'. 'Dear {name}' in the email context
  const name = Username.split('#')[0];

  // Construct the email message based on the type
  if (type == 'verification-code') {
    msg.subject = 'Email Verification Code';
    msg.html = `
      <p>Hello ${name},</p>
      <p>Thank you for registering with our service. To complete the registration process, please enter the following verification code:</p>
      <h1>${options.verificationCode}</h1>
      <p>Please enter this code on the registration page to verify your email address.</p>
      <p>If you did not request this verification code, please ignore this email.</p>
      <p>Best regards,</p>
      <p>Amr Hedeiwy</p>
    `;
  } else if (type == 'forgot-password') {
    msg.subject = 'Password Reset Request';
    msg.html = `
      <p>Dear ${name},</p>
      <p>We have received a request to reset your password for your Deiwy account. To proceed with resetting your password, please click the button below:</p>
      <p>
        <a href="${process.env.CLIENT_URL}/reset-password/token=${options.useridToken}" target="_blank" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
      </p>
      <p>If clicking the button above doesn't work, you can copy and paste the following URL into your browser's address bar:</p>
      <p>${process.env.CLIENT_URL}/password/reset/${options.useridToken}</p>
      <p>If you did not request a password reset, please disregard this email. Your account is secure, and no changes have been made.</p>
      <p>Please note that the password reset link is valid for a limited time, typically within 1 hour. If the link expires, you can request another password reset by visiting the [Forgot Password] page on our website.</p>
      <p>If you have any questions or need further assistance, please don't hesitate to contact our support team at amr.hedeiwy@gmail.com.</p>
      <p>Thank you for using Deiwy.</p>
      <p>Best regards,<br>Hedeiwy<br>Deiwy</p>
    `;
  }

  try {
    // Send the email using the configured email service (sgMail)
    await sgMail.send(msg);

    return {
      message: successJson.mailer.messages[type],
      status: successJson.mailer.status,
      ...(type === 'email-verification'
        ? { redirect: successJson.mailer.redirect['verify-email'] }
        : null)
    };
  } catch (err) {
    console.error('MAILER ERROR', err);
    return { failed: new MailerError() };
  }
};

export default mailer;
