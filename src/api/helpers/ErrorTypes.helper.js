import sequelize from 'sequelize';
import errorsJson from '../../config/errors.json' assert { type: 'json' };

/**
 * Base class for all custom error classes. Extends the
 * built-in `Error` class.
 *
 * @class
 * @extends Error
 */
export class BaseError extends Error {
  constructor() {
    super();

    // Set the name to the name of the constuctor function
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Represents an error that occurs when a user fails to sign in due to
 * incorrect email or password.
 */
export class SignInError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code and message.

  getResponse() {
    return errorsJson.sign_in_email;
  }
}

/**
 * Represents an error that occurs when the account is not
 * verified.
 */
export class EmailError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code, message, and redirect URL.
  getResponse() {
    return errorsJson.not_verified;
  }
}

/**
 * Represents an error that occurs when the server fails to send the email to the user.
 */
export class MailerError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code, message, and redirect URL.
  getResponse() {
    return errorsJson.mailer;
  }
}

/**
 * Represents an error that occurs with social media authentication.
 */
export class SocialMediaAuthenticationError extends BaseError {
  constructor(details, provider) {
    super();

    this.details = details || null;
    this.provider = provider;
  }

  // Returns the response containing the status code, message, and redirect URl.
  getResponse() {
    const status = errorsJson.sign_in_provider.status;
    const message = errorsJson.sign_in_provider.essage;
    const redirect = errorsJson.sign_in_provider[`${this.provider}_redirect`];

    return { status, message, redirect };
  }
}

/**
 * Represents an error that occurs during verification code validation.
 */
export class VerificationCodeError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code and message.
  getResponse() {
    return errorsJson.verification_code;
  }
}

/**
 * Represents an error that occurs when the user attempts to request
 * a password reset link for an account that is not registered by email (Local strategy).
 */
export class ForgotPassswordError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code, message, and redirect URL.
  getResponse() {
    return errorsJson.forgot_password;
  }
}

/**
 * Represents an error that occurs during verification of the JWT token at the resetPasswordDecoder middlware.
 */
export class ResetPasswordError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code, message and redirect URL.
  getResponse() {
    return errorsJson.reset_password_ink;
  }
}

/**
 * Represents an error that occurs when user is not found from the database.
 */
export class UserNotFoundError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code and message.
  getResponse() {
    return errorsJson.user_not_found;
  }
}

/**
 * Represents an error that occurs when the user exceeds the number of requests for
 * a specific route.
 *
 * @param {string} route - The route associated with the rate limit error.
 * @example '/sign-in', 'verify-email'
 */
export class RateLimitError extends BaseError {
  constructor(route) {
    super();

    this.route = route;
  }

  // Returns the response containing the status code and message.
  getResponse() {
    const message = errorsJson.rate_limit.messages[this.route];
    const status = errorsJson.rate_limit.status;

    return { status, message };
  }
}

/**
 * Represents an error that occurs due to validation failure using a Joi Schema.
 *
 * @param {Array} details - The validation error details.
 */
export class JoiValidationError extends BaseError {
  constructor(details, source) {
    super();

    this.details = details;
    this.source = source;
  }

  // Returns the response containing the status code and validation error messages.
  getResponse() {
    const status =
      source === 'auth'
        ? errorsJson.validations.status
        : errorsJson.unexpected.status;
    /**
     * Retrieves the validation error messages based on the validation error details.
     * @param {Array} details - The validation error details.
     * @returns {Object} - An object containing field names as keys and corresponding error messages as values.
     */

    let message;

    if (source === 'auth') {
      message = this.details.reduce((acc, err) => {
        const label = err.label;
        const code = err.code;

        /**
         * Checking for Required field validation errors.
         * Adding the field name as the key and the error message as the value to the accumulator.
         */

        let fieldMessage;
        if (code === 'string.empty' || code === 'any.required') {
          fieldMessage = 'Required';
        } else {
          // Else extract the error message from errors.json file.
          fieldMessage = errorsJson.validations.messages[label];
        }

        acc.push({ fieldName: label, fieldMessage });
        return acc;
      }, []);
    } else {
      message = errorsJson.unexpected.message;
    }

    return { status, message };
  }
}

/**
 * Represents an error that occurs due to a constraint violation in Sequelize.
 *
 * @param {sequelize.UniqueConstraintError} details - The details of the constraint error.
 */
export class SequelizeConstraintError extends BaseError {
  constructor(details) {
    super();
    this.details = details;
  }

  // Returns the response containing the status code and error message.
  getResponse() {
    const message = errorsJson.constraints.messages.Email;
    const status = errorsJson.constraints.status;

    return { status, message };
  }
}

/**
 * Represents an error that occurs when invalid file format is chosen.
 */
export class InvalidFileFormat extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code and error message.
  getResponse() {
    const message = errorsJson.image.messages['file-format'];
    const status = errorsJson.image.status;
    return { message, status };
  }
}

/**
 * Represents an error that occurs when current password does not match the password stored in the database (sequelize).
 */
export class ChangePasswordError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code and error message.
  getResponse() {
    const message = errorsJson.change_password.message;
    const status = errorsJson.change_password.status;
    return { message, status };
  }
}

/**
 * Represents an error that occurs when the prompted email does not match the user's email.
 */
export class DeleteAccountError extends BaseError {
  constructor() {
    super();
  }

  // Returns the response containing the status code and error message.
  getResponse() {
    return errorsJson.remove_account;
  }
}
