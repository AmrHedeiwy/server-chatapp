import Joi from 'joi';
/**
 * Returns middlware that validates the user's data.
 *
 * @param {Joi.schema} schema - The Joi schema to validate the request
 * object against.
 * @returns {Function} The next middleware in the chain.
 *
 * @middleware
 * @summary Validates the user's data from the request object against Joi schema.
 * @param {Object} req - The HTTP request object.
 * @param {Object} req.body - The request body containing user data.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 *
 * If the validation passes:
 * - We update the req.body to the stripped values(removes unnecessary
 * data from the object).
 * - The next() function is called.
 *
 * If the validation fails:
 * - The next() function is called passing an error object.
 *
 * The error object contains the following properties:
 * - type: Type of error.
 * - details: Additional error detials.
 */
const validation = (schema) => async (req, res, next) => {
  const body = req.body;
  try {
    const { error, value } = schema.validate(body);
    if (error) throw error;

    req.body = value;

    next();
  } catch (err) {
    // Ensuring a consistant error format.
    err.details.forEach((error) => {
      // Field name where the error occured.
      error.path = error.path[0];

      /**
       * Name of validation.
       * - Can be `is` which means the field does not follow
       * a pattern (regex).
       * - Can be `string.empty` or `any.required` which means the
       * field was left empty.
       */
      error.validatorName = error.type;
    });
    next(err);
  }
};

export default validation;
