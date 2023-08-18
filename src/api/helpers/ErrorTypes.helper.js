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
 * Represents an error related to email functionality.
 *
 * @class
 * @extends BaseError
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
}

/**
 * Represents an error that occurs when a user fails to sign in due to
 * incorrect email or password.
 *
 * @class
 * @extends BaseError
 */
export class SignInError extends BaseError {
  constructor() {
    super();
  }
}

/**
 * Represents an error that occurs during social media authenticaion.
 *
 * @class
 * @extends BaseError
 * @param {string|null} details - Additional details about the error occurence.
 *
 * Possible values:
 * - If the email is already being used (sequelize.UniqueConstraintError).
 * - Any other error that could occur during the social-media account selection.
 */
export class SocialMediaAuthenticationError extends BaseError {
  constructor(details) {
    super();

    this.details = details || null;
  }
}

/**
 * Represents an error that occurs during verification code validation.
 *
 * @class
 * @extends BaseError
 * @param {string} type - The type of verification code error.
 *
 * Possible types:
 * - 'Expired' -> The verification code has expired.
 * - 'Invalid' -> The verification code the user entered is invalid.
 */
export class VerificationCodeError extends BaseError {
  constructor(type) {
    super();

    this.type = type;
  }
}

/**
 * Represents an error during reset password requests.
 * This error is only generated during verification of the JWT token at the Joi resetPasswordSchema.
 *
 * @class
 * @extends BaseError
 */
export class ResetPasswordError extends BaseError {
  constructor() {
    super();
  }
}

/**
 * Error class for User not found errors. Extends the `BaseError` class.
 *
 * @class
 * @extends BaseError
 */
export class UserNotFoundError extends BaseError {
  constructor() {
    super();
  }
}
