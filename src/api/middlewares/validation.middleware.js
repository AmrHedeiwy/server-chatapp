import Joi from 'joi';

/**
 * Returns middlware that validates the user's data.
 *
 * @param {Joi.schema} schema - The Joi schema to validate the request
 * object against.
 * @returns {Function} The next middleware in the chain.
 */
const validation =
  (schema) =>
  /**
   * Validates the user's credentials from the request object against Joi schema.
   *
   * @param {Object} req - The HTTP request object.
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
   */
  async (req, res, next) => {
    const body = req.body;

    try {
      const { error, value } = schema.validate(body);
      if (error) throw error;

      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };

export default validation;
