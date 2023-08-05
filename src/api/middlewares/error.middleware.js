import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });
import Joi from 'joi';
import sequelize from 'sequelize';
import {
  EmailError,
  AuthenticationError,
  SocialMediaAuthenticationError,
  VerificationCodeError,
  UserNotFoundError
} from '../helpers/ErrorTypes.helper.js';

// Loading the validation, contraint, and server errors from errors.json file
import errorsJSON from '../../config/errors.json' assert { type: 'json' };

/**
 * Calls rhe appropriate middleware based on the error type.
 *
 * @middleware
 * @param {Object} error - The error object.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
const errorMiddleware = (error, req, res, next) => {
  // Hanlde Sequelize constraint errors.
  if (error instanceof sequelize.UniqueConstraintError) {
    constraintError(error, req, res, next);
  }

  // Handle Joi and Sequelize validation errors.
  else if (
    error instanceof Joi.ValidationError ||
    error instanceof sequelize.ValidationError
  ) {
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

  // Handle user not found errors.
  else if (error instanceof UserNotFoundError) {
    userNotFoundError(error, req, res, next);
  }

  // Handles authentication errors.
  else if (error instanceof AuthenticationError) {
    authenticationError(error, req, res, next);
  }

  // Handles social media authentication errors.
  else if (error instanceof SocialMediaAuthenticationError) {
    socialMediaAuthenticationError(error, req, res, next);
  }

  // Handle all other errors as server errors.
  else serverError(error, req, res, next);
};

/**
 * For validation errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error with
 * status code 400 Bad Request.
 *
 * @example { type: 'ConstraintError', details: { Firstname: '<error_message>', Lastname: '<error_message>' } }
 */
const validationError = (error, req, res, next) => {
  // Extracting the appropriate status code.
  const statusCode = errorsJSON.validations.code;

  // Joi generates error.details (Array<object>) while Sequeize generates error.errors (Array<object>).
  const errorArray = error.details || error.errors;

  // Filtering the error to obtian path and validator name
  const filteredValidationError = errorArray.reduce(
    (acc, err) => {
      // If the path value does not exist in the accumulator, we push the path and validator name as an object to it.
      if (!acc.some((obj) => obj.path === err.path)) {
        acc.push({
          path: err.path,
          validatorName: err.validatorName
        });
      }

      return acc;
    },
    [
      /**
       * @example
       * [ { path: 'Firstname', validatorName: 'string.empty' },
       *   { path: 'Lastname', validatorName: 'string.empty' }
       *   { path: 'Password', validatorName: 'is' } ]
       *
       * - Notice that the path value does not repeat.
       *
       * - This is done as when Sequelize ORM throws a Validation Error,
       * it sometimes throws an error for the same field twice. This is because
       * Sequelize throws an error for every validation rule for the same field. And
       * we only want to obtain the first error thrown for that field.
       *
       * - Validations by default are handled by the Joi schema. But if for some reason the
       * response body object bypassed the Joi validation, we ensure that the error can be consistantly handled
       * between Joi and Sequeize ORM.
       */
    ]
  );

  // Form an object to contain the field name as the key and the error message as the value.
  const formattedValidationError = filteredValidationError.reduce(
    (acc, err) => {
      // Extracting the field name.
      const field = err.path;

      var message;
      // Checking for Required field validation errors.
      if (
        err.validatorName === 'string.empty' ||
        err.validatorName === 'any.required' ||
        err.validatorName === 'notEmpty'
      ) {
        message = `${field} is required.`;
      } else {
        // Else extract the error message from errors.json file.
        message = errorsJSON.validations.messages[field];
      }

      // Add the field name as the key and the error message as the value to the accumulator.
      acc[field] = message;

      return acc;
    },
    {}
  );

  // Send the formatted error object to the user.
  res
    .status(statusCode)
    .json({ type: 'ValidationError', details: formattedValidationError });
};

/**
 * For constraint errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error with
 * status code 422 Unprocessable Entity.
 *
 * @example { type: 'ConstraintError', details: { message: '<error_message>'} }
 */
const constraintError = (error, req, res, next) => {
  // Extracting field name.
  const field = error.errors[0].path;

  // Extracting appropriate message and status code for the error based on the field.
  const message = errorsJSON.constraints.messages[field];
  const statusCode = errorsJSON.constraints.code;

  // Sending the status code and the response object.
  res
    .status(statusCode)
    .json({ type: 'ConstraintError', details: { message } });
};

/**
 * For email verification errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error with
 * appropriate status code based on the error type.
 *
 * Email errors could occur by:
 * - The user has not verified their email. (500 Internal Server Error)
 * - The server fails to send the email to the user. (403 Forbidden)
 *
 * @example { type: 'EmailError', details: { message: '<error_message>' } }
 */
const emailError = (error, req, res, next) => {
  const statusCode = errorsJSON.server.Email[error.type].code;
  const message = errorsJSON.server.Email[error.type].message;

  res.status(statusCode).json({
    type: 'EmailError',
    details: { message }
  });
};

/**
 * For verification code errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error with
 * appropriate status code based on the error type.
 *
 * Email errors could occur by:
 * - The verification code has expried. (410 Gone)
 * - The verification code the user entered is invalid. (400 Bad Request)
 *
 * @example { type: 'VerificationCode', details: { message: '<error_message>' } }
 */
const verificationCodeError = (error, req, res, next) => {
  const statusCode = errorsJSON.server.VerificationCode[error.type].code;
  const message = errorsJSON.server.VerificationCode[error.type].message;

  res
    .status(statusCode)
    .json({ type: 'VerificationCode', details: { message } });
};

/**
 * For user not found errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error with
 * status code 404 Not Found.
 *
 * @example { type: 'UserNotFound', details: { message: '<error_message>' } }
 */
const userNotFoundError = (error, req, res, next) => {
  // Extracting appropriate status code and error message.
  statusCode = errorsJSON.server.UserNotFound.code;
  message = errorsJSON.server.UserNotFound.message;

  // Add the error message to the flash message and redirect to the registration page.
  res.status(statusCode).json({ type: 'UserNotFound', details: { message } });
};

/**
 * If the email address in not found or the password was invalid.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error with
 * status code 400 Bad Request.
 *
 * @example { type: 'AuthenticationError', details: { message: '<error_message>' } }
 */
const authenticationError = (error, req, res, next) => {
  // Extracting appropriate status code and error message.
  const statusCode = errorsJSON.server.signin.code;
  const message = errorsJSON.server.signin.message;

  res
    .status(statusCode)
    .json({ type: 'AuthenticationError', details: { message } });
};

/**
 * For errors that occur during the social media authentication process.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {URL} Redirect the user to the sign-up page.
 *
 * Error occurence:
 * - If the email is already being used.
 * - Any other error that could occur during the social-media
 * account selection.
 */
const socialMediaAuthenticationError = (error, req, res, next) => {
  var statusCode;

  // Checking if the error is related to sequelize unique constraint error.
  if (error.details instanceof sequelize.UniqueConstraintError) {
    // Extracting field name.
    const field = error.details.errors[0].path;

    // Extracting appropriate status code and error message.
    statusCode = errorsJSON.constraints.code;
    const message = errorsJSON.constraints.messages[field];

    // Set the flash object to the error message.
    req.flash('error', message);
  } else {
    // Extracting appropriate status code and error message.
    statusCode = errorsJSON.server.Unexpected.code;
    const message = errorsJSON.server.Unexpected.message;

    // Set the flash object to the error message.
    req.flash('error', message);

    // Logging the error to the console.
    console.error(error);
  }

  // Redirect the user to the sign-in page.
  res.status(statusCode).redirect('/sign-in.html');
};

/**
 * For unexpected/server errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} Send an appropriate error message with
 * with status code 500 Internal Server Error.
 */
const serverError = (error, req, res, next) => {
  // Logging the error to the server.
  console.error(error);

  // Extracting appropriate message and status code.
  const message = errorsJSON.server.Unexpected.message;
  const statusCode = errorsJSON.server.Unexpected.code;

  res.status(statusCode).json({ type: 'ServerError', details: { message } });
};

export default errorMiddleware;
