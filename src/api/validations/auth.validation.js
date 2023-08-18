import Joi from 'joi';
import { ResetPasswordError } from '../helpers/ErrorTypes.helper.js';
import jwt from 'jsonwebtoken';

/**
 * Register Schema
 *
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
}).options({ abortEarly: false });

/**
 * Sign in Schema
 *
 * Joi schema for validating the sign in request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} Email - Must be a valid email address and present.
 * @property {Joi.StringSchema} Password - Must be present.
 */
export const signInSchema = Joi.object({
  Email: Joi.string().email().required(),
  Password: Joi.string().required()
}).options({ abortEarly: false });

/**
 * Reset Password Schema
 *
 * Joi schema for validating the reset password request payload.
 *
 * @type {Joi.ObjectSchema}
 * @property {Joi.StringSchema} Token - The token for password reset, verified using the secret.
 * @property {Joi.StringSchema} NewPassword - The new password for the user.
 * @property {Joi.StringSchema} ConfirmPassword - The confirmation of the new password, should match the 'NewPassword' field.
 */
export const resetPasswordSchema = Joi.object({
  Token: Joi.string()
    .custom((value, helpers) => {
      try {
        return jwt.verify(value, 'mysec');
      } catch (error) {
        throw helpers.error('any.custom', error);
      }
    })
    .error(new ResetPasswordError()),
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
});
