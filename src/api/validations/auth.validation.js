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
  console.log(formattedError);
  return new JoiValidationError(formattedError);
}

/**
 * Joi schema for validating the register request payload.
 *
 * @property {Joi.StringSchema} Username - The username of the user. Must be
 * between 3 and 20 letters, digits, underscores, or hyphens.
 * @property {Joi.StringSchema} Email - The email address of the user. Must be
 * unique and in valid email format.
 * @property {Joi.StringSchema} Password - The password of the user. Must be
 * at least 8 characters long and contain at least one uppercase letter,
 * one lowercase letter, one digit, and one special character from
 * the set @$!%?&.
 * @property {Joi.StringSchema} ConfirmPassword - The confirmation of the password, should match the 'Password' field.
 * @property {Joi.BooleanSchema} TermsOfAgreement - Must be accepted
 */
export const registerSchema = Joi.object({
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
    .strip()
  // TermsOfAgreement: Joi.boolean().valid(true).required().strip()
})
  .options({ abortEarly: false })
  .unknown()
  .error(errorFormatter);

/**
 * Joi schema for validating the sign in request payload.
 *
 * @property {Joi.StringSchema} Email - Must be a valid email address and present.
 * @property {Joi.StringSchema} Password - Must be present.
 * @property {Joi.BooleanSchema} - Optional.
 */
export const signInSchema = Joi.object({
  Email: Joi.string().email().required(),
  Password: Joi.string().required(),
  RememberMe: Joi.boolean()
})
  .options({ abortEarly: false })
  .unknown()
  .error(errorFormatter);

/**
 * Joi schema for validating the forgot password request payload.
 *\
 * @property {Joi.StringSchema} Email - Must be a valid email address and present.
 */
export const forgotPasswordRequestSchema = Joi.object({
  Email: Joi.string().email().required()
}).error(errorFormatter);

/**
 * Joi schema for validating the reset password request payload.
 *
 * @property {Joi.StringSchema} Password - The new password for the user.
 * @property {Joi.StringSchema} ConfirmPassword - The confirmation of the new password, should match the 'Password' field.
 */
export const resetPasswordSchema = Joi.object({
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
    .strip()
})
  .unknown()
  .options({ abortEarly: false })
  .error(errorFormatter);
