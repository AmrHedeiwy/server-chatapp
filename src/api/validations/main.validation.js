import Joi from 'joi';
import { mainErrorFormatter } from './errorFormater.js';

/**
 * Joi schema for validating the payload when updatin the user's profile.
 *
 * - username: The updated username of the user. Must be between 3 and 20 letters, digits, underscores, or hyphens.
 * - email: The updated email address of the user. Must be in valid email format.
 */
export const editUserSchema = Joi.object({
  username: Joi.string()
    .trim()
    .pattern(/^[A-Za-z\d_-]{3,20}$/),
  email: Joi.string().trim().email()
})
  .options({ abortEarly: false })
  .error(mainErrorFormatter);

/**
 * Joi schema for validating the payload when changing the user's password.
 *
 * - currentPassword: The current password of the user.
 * - password: The new password for the user. Must contain at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long.
 * - confirmPassword: The confirmation of the new password. Must match the 'password' field.
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
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
  .options({ abortEarly: false })
  .error(mainErrorFormatter);

/**
 * Joi schema for validating the payload when creating a conversation.
 *
 * - otherUserId: The ID of the other user involved in the conversation.
 * - isGroup: Indicates whether the conversation is a group conversation.
 * - name: The name of the conversation.
 * - members: The array of user IDs participating in the conversation excluding the the user creating the conversation.
 */
export const createConversationSchema = Joi.object({
  memberIds: Joi.array().min(1).required(),
  name: Joi.string()
    .min(2)
    .when('isGroup', {
      is: Joi.exist().valid(true),
      then: Joi.required()
    })
})
  .unknown()
  .error(mainErrorFormatter);

/**
 * Joi schema for validating the payload when updating the name of a group conversation.
 *
 * - name: The updated name of the conversation.
 */
export const updateNameSchema = Joi.object({
  name: Joi.string().min(2).required()
})
  .unknown()
  .error(mainErrorFormatter);

/**
 * Joi schema for validating the payload when adding members to a group conversation.
 *
 * - memberIds: The array of user IDs to be added as members to the conversation.
 */
export const addMembersSchema = Joi.object({
  memberIds: Joi.array().min(1).required()
})
  .unknown()
  .error(mainErrorFormatter);
