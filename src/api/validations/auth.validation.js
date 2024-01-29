import Joi from 'joi';
import { authErrorFormatter } from './errorFormater.js';

/**
 * Joi schema for validating the register request payload.
 *
 * This schema defines the structure and validation rules for the register request payload,
 * including username, email, password, confirmation of the password, and acceptance of terms of agreement.
 *
 * - username:  Must be between 3 and 20 letters, digits, underscores, or hyphens.
 * - email: Must be unique and in valid email format.
 * - password: The password of the user. Must be at least 8 characters long and contain at least one uppercase letter,
 * one lowercase letter, one digit, and one special character from the set @$!%?&.
 * - confirmPassword: The confirmation of the password, should match the 'Password' field.
 * - termsOfAgreement: Must be accepted
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
 * Joi schema for validating the sign-in request payload.
 *
 * This schema defines the structure and validation rules for the sign-in request payload,
 * including email, password, and an optional rememberMe flag.
 */
export const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional()
})
  .options({ abortEarly: false })
  .unknown()
  .error(authErrorFormatter);

/**
 * Joi schema for validating the forgot password request payload.
 *
 * This schema defines the structure and validation rules for the forgot password request payload,
 * specifically for the email field, which must be a valid email address and is required.
 */
export const forgotPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required()
}).error(authErrorFormatter);

/**
 * Joi schema for validating the reset password request payload.
 *
 * This schema defines the structure and validation rules for the reset password request payload,
 * including the new password and its confirmation.
 *
 * @type {object}
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
