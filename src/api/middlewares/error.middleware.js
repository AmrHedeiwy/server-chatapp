import Joi from 'joi';
import sequelize from 'sequelize';
import { EmailVerificationError } from '../helpers/ErrorTypes.helper.js';

// Loading the validation, contraint, and server errors from errors.json file
import errorsJSON from '../../config/errors.json' assert { type: 'json' };
const validationErrors = errorsJSON.validations;
const constraintErrors = errorsJSON.constraints;
const serverErrors = errorsJSON.server;

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

    // fdffd
  } else if (error instanceof EmailVerificationError) {
    emailVerificationError(error, req, res, next);
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
 * The response object contains the following:
 *  - Key: Field name where the error occured.
 *  - Value: Appropriate error message based on the field name.
 * @example { Firstname: '<error_message>', Lastname: '<error_message>' }
 */
async function validationError(error, req, res, next) {
  // Extracting the appropriate status code.
  const statusCode = validationErrors.code;

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
        message = validationErrors.messages[field];
      }

      // Add the field name as the key and the error message as the value to the accumulator.
      acc[field] = message;

      return acc;
    },
    {}
  );

  // Send the formatted error object to the user.
  res.status(statusCode).json(formattedValidationError);
}

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
 * The response object contains the following:
 *  - Key: Field name where the error occured.
 *  - Value: Appropriate error message based on the field name.
 * @example { Email: '<error_message>' }
 */
async function constraintError(error, req, res, next) {
  // Extracting field name.
  const field = error.errors[0].path;

  // Extracting appropriate message for the error based on the field.
  const message = constraintErrors.messages[field];

  // Extracting the appropriate status code.
  const statusCode = constraintErrors.code;

  // Sending the status code and the response object.
  res.status(statusCode).json({ [field]: message });
}

/**
 * For email verification errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information about the error.
 *
 * The response object contains the following:
 * Key: EmailVerificationError.
 * Value: Error message.
 * @example { EmailVerificationError: '<error_message>' }
 */
async function emailVerificationError(error, req, res, next) {
  var message;
  var statusCode;

  /**
   * Extracting the appropriate error message depending on the type.
   *
   * Email verification errors could occur by:
   * - The server unable to send the email to the email prompted.
   * - The user clicks the email verification link but the server fails to find
   * user in the database.
   */
  switch (error.type) {
    case 'notFound':
      message = serverErrors.UserNotFound.message;
      statusCode = serverErrors.UserNotFound.code;
      break;
    case 'failToSendEmailVerification':
      // Log the error to the server.
      console.error(error);

      message = serverErrors.EmailVerificationSendError.message;
      statusCode = serverErrors.EmailVerificationSendError.code;
      break;
    default:
      break;
  }

  res.status(statusCode).json({ EmailVerificationError: message });
}

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
async function serverError(error, req, res, next) {
  // Logging the error to the server.
  console.error(error);

  // Extracting appropriate message.
  const message = serverErrors.Unexpected.message;

  // Extracting the appropriate status code.
  const statusCode = serverErrors.Unexpected.code;

  res.status(statusCode).json({ message });
}

export default errorMiddleware;
