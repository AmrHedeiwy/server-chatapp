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
  switch (error.type) {
    // Handle validation errors.
    case 'ValidationError':
      validationError(error, req, res, next);
      break;

    // Hanlde constaint errors.
    case 'ConstraintError':
      constraintError(error, req, res, next);
      break;

    // Handle all other errors as server errors.
    default:
      serverError(error, req, res, next);
      break;
  }
};

/**
 * For validation errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} A response object containg information avout the error.
 *
 * The response object contains the following:
 *  - field name (where the error occured, represented as a key).
 *  - error message (appropriate error message based on the field name).
 */
async function validationError(error, req, res, next) {
  // Extracting the appropriate status code.
  const statusCode = validationErrors.code;

  // Filtering the error to obtian path and validator name
  const filteredValidationError = error.details.reduce(
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
       * it sometimes throws an error for the same field twice. That is because the same field
       * contains more than one validation rule.
       *
       * - Validations by default are handled by the Joi schema. But if for some reason the
       * response body object bypassed the Joi validation, we ensure that the error is consistantly handled
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
 */
async function constraintError(error, req, res, next) {
  // Extracting field name.
  const field = error.details[0].path;

  // Extracting appropriate message for the error based on the field.
  const message = constraintErrors.messages[field];

  // Extracting the appropriate status code.
  const statusCode = constraintErrors.code;

  // Sending the status code and object containing field name as the key and the message as the value.
  res.status(statusCode).json({ [field]: message });
}

/**
 * For unexpected/server errors.
 *
 * @middleware
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
async function serverError(error, req, res, next) {
  // Logging the error to the server.
  console.error(error);

  // Extracting appropriate message for the error based on the field.
  const message = serverErrors.message;

  // Extracting the appropriate status code.
  const statusCode = serverErrors.code;

  res.status(statusCode).json({ message });
}

export default errorMiddleware;
