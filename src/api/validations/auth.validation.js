import Joi from 'joi';

/**
 * Defines the valitdation rules that execute when a
 * user enters their register credentials using Joi library.
 *
 * @property {string} Firstname - The first name of the user. Must be
 * between 2 and 30 letters only.
 * @property {string} Lastname - The last name of the user. Must be
 * between 2 and 30 letters only.
 * @property {string} Username - The username of the user. Must be
 * between 3 and 20 letters, digits, underscores, or hyphens.
 * @property {string} Email - The email address of the user. Must be
 * unique and in valid email format.
 * @property {string} Password - The password of the user. Must be
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
  RepeatPassword: Joi.string()
    .trim()
    .empty('')
    .required()
    .valid(Joi.ref('Password'))
    .messages({
      'any.required': '"RepeatPassword" is not allowed to be empty'
    })
    .strip(),
  TermsOfAgreement: Joi.boolean().valid(true).required().strip()
}).options({ abortEarly: false });

/**
 * Defines the valitdation rules that execute when a
 * user enters their sign in credentials using Joi library.
 *
 * @property {string} Email - Must be a valid email address and present.
 * @property {string} Password - Must be present.
 */
export const signInSchema = Joi.object({
  Email: Joi.string().email().required(),
  Password: Joi.string().required()
}).options({ abortEarly: false });
