import Joi from 'joi';
import { mainErrorFormatter } from './errorFormater.js';

/**
 * Joi schema for validating the user profile edit request payload.
 *
 * This schema defines the structure and validation rules for the user profile edit request payload,
 * including username and email.
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
 * Joi schema for validating the change password request payload.
 *
 * This schema defines the structure and validation rules for the change password request payload,
 * including currentPassword, password, and confirmPassword.
 *
 * - currentPassword: The current password of the user.
   - password: The new password for the user.
 * - confirmPassword: The confirmation of the new password, should match the 'password' field.
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
 * Joi schema for validating the contact request payload.
 *
 * This schema defines the structure and validation rules for the contact request payload,
 * including contactId and action.
 *
 * - contactId: The ID of the contact.
 * - action: The action to perform on the contact. Must be either 'add' or 'remove'.
 */
export const contactSchema = Joi.object({
  contactId: Joi.string().required(),
  action: Joi.string().valid('add', 'remove').required()
}).error(mainErrorFormatter);

/**
 * Joi schema for validating the create conversation request payload.
 *
 * This schema defines the structure and validation rules for the create conversation request payload,
 * including otherUserId, isGroup, name, and members.
 *
 * - otherUserId: The ID of the other user involved in the conversation.
 * - isGroup: Indicates whether the conversation is a group conversation.
 * - name: The name of the conversation.
 * - members: The array of user IDs participating in the conversation. Must contain at least 2 user IDs if present.
 */
export const createConversationSchema = Joi.object({
  isGroup: Joi.boolean(),
  members: Joi.array()
    .min(2)
    .when('isGroup', {
      is: Joi.exist().valid(true),
      then: Joi.required()
    }),
  name: Joi.string()
    .min(2)
    .when('isGroup', {
      is: Joi.exist().valid(true),
      then: Joi.required()
    }),
  otherUserId: Joi.string().when('isGroup', {
    not: Joi.exist().valid(true),
    then: Joi.required()
  })
}).error(mainErrorFormatter);
