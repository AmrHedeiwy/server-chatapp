import Joi from 'joi';
import { authErrorFormatter } from './errorFormater.js';

/**
 * Joi schema for validating the request payload when a user registers for a new account.
 *
 * This schema defines the validation rules for the fields required during user registration.
 * - username: Must be between 3 and 20 characters, allowing letters, digits, underscores, or hyphens.
 * - email: Must be unique and in a valid email format.
 * - password: Must be at least 8 characters long and contain at least one uppercase letter,
 *   one lowercase letter, one digit, and one special character from the set @$!%?&.
 * - confirmPassword: Must match the 'Password' field.
 * - termsOfAgreement: Must be accepted.
 */
export const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .pattern(/^[A-Za-z\d_-]{3,20}$/)
    .required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .trim()
    .pattern(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required(),
  confirmPassword: Joi.string()
    .trim()
    .empty('')
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.required': '"ConfirmPassword" is not allowed to be empty'
    })
    .strip(),
  termsOfAgreement: Joi.boolean().valid(true).required().strip()
})
  .options({ abortEarly: false })
  .unknown()
  .error(authErrorFormatter);

/**
 * Joi schema for validating the payload with a user signs in to their account.
 *
 * - email: Must be in valid email format.
 * - password: Required field.
 * - rememberMe: Required field, must be a boolean.
 */
export const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().required()
})
  .options({ abortEarly: false })
  .unknown()
  .error(authErrorFormatter);

/**
 * Joi schema for validating the payload when a user requests a forgot-password link.
 *
 * - email: Must be in a valid email format.
 */
export const forgotPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required()
}).error(authErrorFormatter);

/**
 * Joi schema for validating the reset password request payload.
 *
 * - password: Must be at least 8 characters long and contain at least one uppercase letter,
 *   one lowercase letter, one digit, and one special character from the set @$!%?&.
 * - confirmPassword: Must match the 'Password' field.
 *
 */
export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .trim()
    .pattern(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required(),
  confirmPassword: Joi.string()
    .trim()
    .empty('')
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.required': '"ConfirmPassword" is not allowed to be empty'
    })
    .strip()
})
  .unknown()
  .options({ abortEarly: false })
  .error(authErrorFormatter);
