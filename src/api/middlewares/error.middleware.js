// Loading the validation, contraint, and server errors from errors.json file
import errorsJSON from '../../config/errors.json' assert { type: 'json' };
const validationErrors = errorsJSON.validations;
const constraintErrors = errorsJSON.constraints;
const serverErrors = errorsJSON.server;

/**
 * Calls rhe appropriate middleware based on the error type.
 *
 * @param {Object} error - The error object.
 * @param {string} error.type - The sequelize error type.
 * Could be a validation, constraint, or server error.
 * @param {string} error.field - The field name where error occured at.
 * @param {string} error.info - Information about the error.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
const errorMiddleware = (error, req, res, next) => {
  switch (error.type) {
    case 'ValidationError':
      validationError(error, req, res, next);
      break;
    case 'ConstraintError':
      constraintError(error, req, res, next);
      break;
    default:
      serverError(error, req, res, next);
      break;
  }
};

/**
 * For validation errors.
 *
 * @param {Object} error - The object containg error information.
 * @param {string} error.errors[0].path - The field name that contains
 * the error.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
async function validationError(error, req, res, next) {
  const statusCode = validationErrors.code;
  const errorArray = error.errors;

  // Contains the field name and the error message for each error stored as an object
  const errorDetails = [];
  errorArray.forEach((error) => {
    let field = error.path[0];
    let message = errorsJSON.validations.messages[field];
    errorDetails.push({ field, message });
  });

  res.status(statusCode).json(errorDetails);
}

/**
 * For constraint errors.
 *
 * @param {Object} error - The object containg error information.
 * @param {string} error.errors[0].path - The field name that contains
 * the error.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
async function constraintError(error, req, res, next) {
  const fieldName = error.field;
  const errorMessage = constraintErrors.messages[fieldName];
  const statusCode = constraintErrors.code;
  res.status(statusCode).json({ field: fieldName, message: errorMessage });
}

/**
 * For unexpected/server errors.
 *
 * @param {Object} error - The object containg error information.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
async function serverError(error, req, res, next) {
  // Logging the error to the server stack
  console.error(error.info.stack);
  const errorMessage = serverErrors.message;
  const statusCode = serverErrors.code;
  res.status(statusCode).json({ message: errorMessage });
}

export default errorMiddleware;
