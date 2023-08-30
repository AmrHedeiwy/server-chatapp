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
 * Joi schema for validating the register request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} Firstname - The first name of the user. Must be
 * between 2 and 30 letters only.
 * @property {Joi.StringSchema} Lastname - The last name of the user. Must be
 * between 2 and 30 letters only.
 * @property {Joi.StringSchema} Username - The username of the user. Must be
 * between 3 and 20 letters, digits, underscores, or hyphens.
 * @property {Joi.StringSchema} Email - The email address of the user. Must be
 * unique and in valid email format.
 * @property {Joi.StringSchema} Password - The password of the user. Must be
 * at least 8 characters long and contain at least one uppercase letter,
 * one lowercase letter, one digit, and one special character from
 * the set @$!%?&.
 */
export const registerSchema = Joi.object({
  Firstname: Joi.string()
    .trim()
    .pattern(/^[A-Za-z]{2,30}$/)
    .required(),
  Lastname: Joi.string()
    .trim()
    .pattern(/^[A-Za-z]{2,30}$/)
    .required(),
  Username: Joi.string()
    .trim()
    .pattern(/^[A-Za-z\d_-]{3,20}$/)
    .required(),
  Email: Joi.string().trim().email().required(),
  Password: Joi.string()
    .trim()
    .pattern(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required(),
  ConfirmPassword: Joi.string()
    .trim()
    .empty('')
    .required()
    .valid(Joi.ref('Password'))
    .messages({
      'any.required': '"ConfirmPassword" is not allowed to be empty'
    })
    .strip(),
  TermsOfAgreement: Joi.boolean().valid(true).required().strip()
})
  .options({ abortEarly: false })
  .error(errorFormatter);

/**
 * Joi schema for validating the sign in request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} Email - Must be a valid email address and present.
 * @property {Joi.StringSchema} Password - Must be present.
 */
export const signInSchema = Joi.object({
  Email: Joi.string().email().required(),
  Password: Joi.string().required()
})
  .options({ abortEarly: false })
  .error(errorFormatter);

/**
 * Joi schema for validating the reset password request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} NewPassword - The new password for the user.
 * @property {Joi.StringSchema} ConfirmPassword - The confirmation of the new password, should match the 'NewPassword' field.
 */
export const resetPasswordSchema = Joi.object({
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
  .unknown()
  .error(errorFormatter);

/**
 * Joi schema for validating the sign in request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} Email - Must be a valid email address and present.
 */
export const forgotPasswordRequestSchema = Joi.object({
  Email: Joi.string().email().required()
}).error(errorFormatter);
