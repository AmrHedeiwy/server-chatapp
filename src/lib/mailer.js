import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import sgMail from '@sendgrid/mail';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MailerError } from '../api/helpers/ErrorTypes.helper.js';
import successJson from '../config/success.json' assert { type: 'json' };
import { redisClient } from './redis-client.js';

// Configure SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends an email to a user with the specified type, recipient details, and options.
 *
 * @param {string} type - Weather the email is for 'verification_code' or 'forgot_password'.
 * @param {string} username - Used in the email context.
 * @param {string} email - The email to send to.
 * @param {object} options - Additional options for the email.
 * @param {string} options.verificationCode - The verification code for email verification (required when type is 'verification_code').
 * @param {string} options.useridToken - The user ID token for password reset (required when type is 'forgot_password').
 * @returns {Promise<Object>} The success response with the message, status and redirect URL if needed.
 * @throws {EmailError} - A failed object if an error occurred during the sending operation.
 */
const mailer = async (currentUserId, username, email, type) => {
  if (type !== 'verification_code' && type !== 'forgot_password')
    throw new Error('Invalid email type: ', type);

  let msg = {
    to: email,
    from: 'amr.hedeiwy@gmail.com',
    subject: '',
    html: ``
  };

  // Construct the email message based on the type
  if (type === 'verification_code') {
    // Generate a 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store the verification code in Redis with a TTL of 15 minutes (code expires in 15 minutes)
    await redisClient.setEx(
      `email_verification:${currentUserId}`,
      60 * 15,
      JSON.stringify({ verificationCode })
    );
    msg.subject = `Verification Code: ${verificationCode}`;
    msg.html = `
      <p>Hello ${username},</p>
      <p>Thank you for registering with our service. To sign in to your account, please enter the following verification code:</p>
      <h1>${verificationCode}</h1>
      <p>Please enter this code on the registration page to verify your email address.</p>
      <p>If you did not request this verification code, please ignore this email.</p>
      <p>Best regards,</p>
      <p>[APP_NAME] Team</p>
    `;
  } else {
    const useridToken = jwt.sign(
      {
        userId: currentUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    msg.subject = 'Password Reset Request';
    msg.html = `
      <p>Dear ${username},</p>
      <p>We received a request to reset the password for your account. To proceed with the password reset, please click the link below:</p>
      <a href="${process.env.CLIENT_URL}/password/reset/${useridToken}" target="_blank" style="style="display: inline-block; background-color: #007bff; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-bottom: 20px;">Reset Password</a>
      <p>If you didn't request this password reset or if you believe this request is in error, please disregard this email. Your password will remain unchanged.</p>
      <p>If you have any questions or need further assistance, please don't hesitate to contact our support team at [Support Email].</p>
      <p>Thank you,</p>
      <p>[APP_NAME] Team</p>
    `;
  }

  try {
    // Send the email using the configured email service (sgMail)
    await sgMail.send(msg);

    return {
      ...successJson.auth.post.mailer[type],
      status: successJson.status.ok
    };
  } catch (err) {
    console.error('MAILER ERROR', err);
    return { failed: new MailerError() };
  }
};

export default mailer;
