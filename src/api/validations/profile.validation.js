import Joi from 'joi';
import { JoiValidationError } from '../helpers/ErrorTypes.helper.js';

/**
 * Formats an array of errors into a JoiValidationError object.
 *
 * @param {Array} errors - The array of errors to be formatted.
 * @returns {JoiValidationError} new instance of JoiValidationError with the formatted error.
 */
function errorFormatter(errors) {
  const formattedError = errors.reduce((acc, err) => {
    /**
     * Pushes the error code and label to the array.
     *
     * @example acc.push({ code: 'string.empty', label: 'Email' })
     */
    acc.push({ code: err.code, label: err.local.label });

    return acc;
  }, []);
  return new JoiValidationError(formattedError);
}

/**
 * Joi schema for validating the edit user profile request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} Username - The username of the user. Must be
 * between 3 and 20 letters, digits, underscores, or hyphens.
 * @property {Joi.StringSchema} Email - The email address of the user. Must be
 * unique and in valid email format.
 */
export const editProfileSchema = Joi.object({
  Username: Joi.string()
    .trim()
    .pattern(/^[A-Za-z\d_-]{3,20}$/),
  Email: Joi.string().trim().email()
})
  .options({ abortEarly: false })
  .error(errorFormatter);

export const changePasswordSchema = Joi.object({
  CurrentPassword: Joi.string().required(),
  NewPassword: Joi.string()
    .trim()
    .pattern(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required()
    .label('Password'),
  ConfirmPassword: Joi.string()
    .trim()
    .empty('')
    .required()
    .valid(Joi.ref('NewPassword'))
    .messages({
      'any.required': '"ConfirmPassword" is not allowed to be empty'
    })
    .strip()
})
  .options({ abortEarly: false })
  .error(errorFormatter);
