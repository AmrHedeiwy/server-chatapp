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
 * Represents an email-related error.
 *
 * @class EmailError
 * @extends BaseError
 *
 * @param {string} type - The type of email error.
 *
 * Possible types:
 * - 'NotVerified' -> The user has not verified their email.
 * - 'FailedToSend' -> The server fails to send the email to the user.
 */
export class EmailError extends BaseError {
  constructor(type) {
    super();

    this.type = type;
  }

  /**
   * Retrieves the response associated with the email error.
   * @returns {Object} - The response containing the status code, message, and redirect URL.
   */
  getResponse() {
    return errorsJson.server.Email[this.type];
  }
}

/**
 * Represents an error that occurs when a user fails to sign in due to
 * incorrect email or password.
 *
 * @class SignInError
 * @extends BaseError
 */
export class SignInError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Retrieves the response associated with the sign-in error.
   * @returns {Object} - The response containing the status code and message.
   */
  getResponse() {
    return errorsJson.server.signin;
  }
}

/**
 * Represents an error that occurs with social media authentication.
 *
 * @class SocialMediaAuthenticationError
 * @extends BaseError
 *
 * @param {any} details - Additional details about the error occurence.
 *
 * Possible values of details:
 * - If the email is already being used (sequelize.UniqueConstraintError).
 * - IF the email is not verified (EmailError).
 * - Any other error that could occur during the social-media account selection.
 */
export class SocialMediaAuthenticationError extends BaseError {
  constructor(details) {
    super();

    this.details = details || null;
  }

  /**
   * Retrieves the response associated with the social media authentication error.
   * @returns {Object} - The response containing the status code, message, and redirect URl.
   */
  getResponse() {
    const redirect = errorsJson.server.socialMedia.redirect;
    let status;
    let message;

    if (this.details instanceof sequelize.UniqueConstraintError) {
      status = errorsJson.server.socialMedia.EmailContraint.status;
      message = errorsJson.server.socialMedia.EmailContraint.message;
    } else if (this.details instanceof EmailError) {
      status = errorsJson.server.socialMedia.EmailVerification.status;
      message = errorsJson.server.socialMedia.EmailVerification.message;
    } else {
      status = errorsJson.server.socialMedia.Unknown.code;
      message = errorsJson.server.socialMedia.Unknown.message;
    }

    return { status, message, redirect };
  }
}

/**
 * Represents an error that occurs during verification code validation.
 *
 * @class VerificationCodeError
 * @extends BaseError
 */
export class VerificationCodeError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Retrieves the response associated with the verification code error.
   * @returns {Object} - The response containing the status code and message.
   */
  getResponse() {
    return errorsJson.server.VerificationCode;
  }
}

/**
 * Represents an error that occurs during verification of the JWT token at the resetPasswordDecoder middlware.
 *
 * @class ResetPasswordError
 * @extends BaseError
 */
export class ResetPasswordError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Retrieves the response associated with the reset password error.
   * @returns {Object} - The response containing the status code, message and redirect URL.
   */
  getResponse() {
    return errorsJson.server.ResetPasswordLink;
  }
}

/**
 * Represents an error that occurs when user is not found from the database.
 *
 * @class UserNotFoundError
 * @extends BaseError
 */
export class UserNotFoundError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Retrieves the response associated with the reset password error.
   * @returns {Object} - The response containing the status code and message.
   */
  getResponse() {
    return errorsJson.server.UserNotFound;
  }
}

/**
 * Represents an error that occurs due to rate limiting.
 *
 * @class RateLimitError
 * @extends BaseError
 *
 * @param {string} route - The route associated with the rate limit error.
 * @example '/sign-in', 'verify-email'
 */
export class RateLimitError extends BaseError {
  constructor(route) {
    super();

    this.route = route;
  }

  /**
   * Retrieves the response associated with the rate limit error.
   * @returns {Object} - The response containing the status code and message.
   */
  getResponse() {
    const message = errorsJson.server.rateLimit.messages[this.route];
    const status = errorsJson.server.rateLimit.status;

    return { status, message };
  }
}

/**
 * Represents an error that occurs due to validation failure using a Joi Schema.
 *
 * @class JoiValidationError
 * @extends BaseError
 *
 * @param {Array} details - The validation error details.
 */
export class JoiValidationError extends BaseError {
  constructor(details) {
    super();

    this.details = details;
  }

  /**
   * Retrieves the response associated with the Joi validation error.
   * @returns {Object} - The response containing the status code and validation error messages.
   */
  getResponse() {
    const status = errorsJson.validations.status;
    /**
     * Retrieves the validation error messages based on the validation error details.
     * @param {Array} details - The validation error details.
     * @returns {Object} - An object containing field names as keys and corresponding error messages as values.
     */
    const messages = this.details.reduce((acc, err) => {
      const label = err.label;
      const code = err.code;

      let message;
      // Checking for Required field validation errors.
      if (code === 'string.empty' || code === 'any.required') {
        message = `Field is required.`;
      } else {
        // Else extract the error message from errors.json file.
        message = errorsJson.validations.messages[label];
      }

      // Add the field name as the key and the error message as the value to the accumulator.
      acc[label] = message;

      return acc;
    }, {});

    return { status, message: messages };
  }
}

/**
 * Represents an error that occurs due to a constraint violation in Sequelize.
 *
 * @class SequelizeConstraintError
 * @extends BaseError
 *
 * @param {sequelize.UniqueConstraintError} details - The details of the constraint error.
 */
export class SequelizeConstraintError extends BaseError {
  constructor(details) {
    super();
    this.details = details;
  }

  /**
   * Retrieves the response associated with the Sequelize constraint error.
   * @returns {Object} - The response containing the status code and error message.
   */
  getResponse() {
    const message = errorsJson.constraints.messages.Email;
    const status = errorsJson.constraints.status;

    return { status, message };
  }
}

/**
 * Represents an error that occurs when invalid file format is chosen.
 *
 * @class InvalidFileFormat
 * @extends BaseError
 */
export class InvalidFileFormat extends BaseError {
  constructor() {
    super();
  }

  getResponse() {
    const message = errorsJson.server.Image.messages.FileFormat;
    const status = errorsJson.server.Image.status;
    return { message, status };
  }
}

export class ChangePasswordError extends BaseError {
  constructor() {
    super();
  }

  getResponse() {
    const message = errorsJson.server.ChangePassword.message;
    const status = errorsJson.server.ChangePassword.status;
    return { message, status };
  }
}
