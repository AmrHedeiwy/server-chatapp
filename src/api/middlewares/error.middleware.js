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
 */
async function validationError(error, req, res, next) {
  // Extracting the appropriate status code.
  const statusCode = validationErrors.code;

  // Array containing error for each field.
  const errorArray = error.details;

  // Form an object to contain the field name as the key and the error message as the value.
  const validationErrorsArray = errorArray.reduce((acc, err) => {
    // Extracting field name.
    let field = err.path[0];

    // Extracting appropriate message for the error based on the field name.
    let message = errorsJSON.validations.messages[field];

    // Add the field name as the key and error message as the value.
    acc[field] = message;
    return acc;
  }, {});

  res.status(statusCode).json(validationErrorsArray);
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
  const field = error.details[0].path[0];

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
  // Logging the error to the server stack.
  console.error(error.details.stack);

  // Extracting appropriate message for the error based on the field.
  const message = serverErrors.message;

  // Extracting the appropriate status code.
  const statusCode = serverErrors.code;

  res.status(statusCode).json({ message });
}

export default errorMiddleware;
