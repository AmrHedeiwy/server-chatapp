import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import Joi from 'joi';
import sequelize from 'sequelize';
import {
  EmailError,
  SignInError,
  SocialMediaAuthenticationError,
  VerificationCodeError,
  UserNotFoundError,
  ResetPasswordError
} from '../helpers/ErrorTypes.helper.js';

// Loading the validation, contraint, and server errors from errors.json file
import errorsJSON from '../../config/errors.json' assert { type: 'json' };

const errorMiddleware = (error, req, res, next) => {
  // Hanlde Sequelize constraint errors.
  if (error instanceof sequelize.UniqueConstraintError) {
    constraintError(error, req, res, next);
  }

  // Handle Joi and Sequelize validation errors.
  else if (error instanceof Joi.ValidationError) {
    validationError(error, req, res, next);
  }

  // Handle emailing-related errors.
  else if (error instanceof EmailError) {
    emailError(error, req, res, next);
  }

  // Handle code verification errors.
  else if (error instanceof VerificationCodeError) {
    verificationCodeError(error, req, res, next);
  }

  // Handle reset password errors
  else if (error instanceof ResetPasswordError) {
    resetPasswordError(error, req, res, next);
  }

  // Handle user not found errors.
  else if (error instanceof UserNotFoundError) {
    userNotFoundError(error, req, res, next);
  }

  // Handles authentication errors.
  else if (error instanceof SignInError) {
    singInError(error, req, res, next);
  }

  // Handles social media authentication errors.
  else if (error instanceof SocialMediaAuthenticationError) {
    socialMediaAuthenticationError(error, req, res, next);
  }

  // Handle all other errors as unexpected errors.
  else unexpectedError(error, req, res, next);
};

/**
 * Handles validation errors.
 *
 * Possible causes:
 * - The data failed to pass the Joi validation Schema
 * -
 */
const validationError = (error, req, res, next) => {
  // Extracting the appropriate status code.
  const status = errorsJSON.validations.code;

  // Form an object to contain the field name as the key and the error message as the value.
  const formattedValidationError = error.details.reduce((acc, err) => {
    const label = err.context.label;
    const code = err.type;

    let message;
    // Checking for Required field validation errors.
    if (code === 'string.empty' || code === 'any.required') {
      message = `${label} is required.`;
    } else {
      // Else extract the error message from errors.json file.
      message = errorsJSON.validations.messages[label];
    }

    // Add the field name as the key and the error message as the value to the accumulator.
    acc[label] = message;

    return acc;
  }, {});

  // Send the formatted error object to the user.
  res
    .status(status)
    .json({ type: 'ValidationError', details: formattedValidationError });
};

/**
 * Handles Sequelize constraint errors, specifically UniqueConstraintError.
 */
const constraintError = (error, req, res, next) => {
  // Extracting field name.
  const field = error.errors[0].path;

  // Extracting appropriate message and status code for the error based on the field.
  const message = errorsJSON.constraints.messages[field];
  const status = errorsJSON.constraints.code;

  // Sending the status code and the response object.
  res.status(status).json({ type: 'ConstraintError', details: { message } });
};

/**
 * Handles email-related errors.
 *
 * Possible causes:
 * - Email is not verified.
 * - Sendgrid failed to send the email to the user.
 */
const emailError = (error, req, res, next) => {
  if (error.type === 'FailedToSend') {
    const status = errorsJSON.server.Email[error.type].code;
    const message = errorsJSON.server.Email[error.type].message;

    res.status(status).json({
      type: 'EmailError',
      details: { message }
    });
  }

  if (error.type === 'NotVerified') {
    const message = errorsJSON.server.Email.NotVerified.message;
    const status = errorsJSON.server.Email.NotVerified.code;

    /**
     * Check if the email verificaiton is not related to a social media created account.
     *
     * Accounts created by socail media will not contain the needsVerification property
     * in the session.
     */
    if (req.session.needsVerification) {
      const redirect = errorsJSON.server.Email.NotVerified.redirect;
      req.flash('error', message);

      // Redirect the user to the email verification page
      return res.status(status).redirect(redirect);
    }
    res.status(status).json(message);
  }
};

/**
 * Handles email-related errors.
 *
 * Possible causes:
 * - The verification code is expired
 * - The verifcation code is invalid
 */
const verificationCodeError = (error, req, res, next) => {
  const status = errorsJSON.server.VerificationCode[error.type].code;
  const message = errorsJSON.server.VerificationCode[error.type].message;

  res.status(status).json({ type: 'VerificationCode', details: { message } });
};

/**
 * Handles reset password errors.
 *
 * Possible causes:
 * - The verification link is invalid
 */
const resetPasswordError = (error, req, res, next) => {
  const status = errorsJSON.server.ResetPasswordLink.code;
  const message = errorsJSON.server.ResetPasswordLink.message;
  const redirect = errorsJSON.server.ResetPasswordLink.redirect;

  req.flash('error', message);
  res.status(status).redirect(redirect);
};

/**
 * Handles user not found errors.
 */
const userNotFoundError = (error, req, res, next) => {
  // Extracting appropriate status code and error message.
  const status = errorsJSON.server.UserNotFound.code;
  const message = errorsJSON.server.UserNotFound.message;

  // Add the error message to the flash message and redirect to the registration page.
  res.status(status).json({ type: 'UserNotFound', details: { message } });
};

/**
 * Handles sign in errors.
 *
 * Possible causes:
 * - The user entered an invalid email.
 * - The user entered an invalid password
 */
const singInError = (error, req, res, next) => {
  // Extracting appropriate status code and error message.
  const status = errorsJSON.server.signin.code;
  const message = errorsJSON.server.signin.message;

  res
    .status(status)
    .json({ type: 'AuthenticationError', details: { message } });
};

/**
 * Handles social media authentication errors.
 * Checks if the error is an Sequelize unique constraint error and extracts the field name.
 * Checks if the error is related to the email not being verified.
 * If it's not a unique constraint error, treat it as an unexpected error.
 */
const socialMediaAuthenticationError = (error, req, res, next) => {
  const redirect = errorsJSON.server.Email.NotVerified.redirect;
  let status;

  // Sequelize unique constraint error.
  if (error.details instanceof sequelize.UniqueConstraintError) {
    // Extracting field name.
    const field = error.details.errors[0].path;

    // Extracting appropriate status code and error message.
    status = errorsJSON.constraints.code;
    const message = errorsJSON.constraints.messages[field];

    // Set the flash object to the error message.
    req.flash('error', message);
  }

  // Email not verified
  else if (err.details instanceof EmailError) {
    // Extracting appropriate status code and error message.
    status = errorsJSON.server.Email.NotVerified.code;
    const message = errorsJSON.server.Email.NotVerified.message;

    // Set the flash object to the error message.
    req.flash('error', message);
  }

  // Unexpected error
  else {
    // Extracting appropriate status code and error message.
    status = errorsJSON.server.Unexpected.code;
    const message = errorsJSON.server.Unexpected.message;

    // Set the flash object to the error message.
    req.flash('error', message);

    // Logging the error to the console.
    console.error(error);
  }

  // Redirect the user to the sign-in page.
  res.status(status).redirect(redirect);
};

/**
 * Handles unexpected errors.
 *
 * Logs the error to the server console.
 */
const unexpectedError = (error, req, res, next) => {
  // Logging the error to the server.
  console.error(error);

  // Extracting appropriate message and status code.
  const message = errorsJSON.server.Unexpected.message;
  const status = errorsJSON.server.Unexpected.code;

  res.status(status).json({ type: 'ServerError', details: { message } });
};

export default errorMiddleware;
