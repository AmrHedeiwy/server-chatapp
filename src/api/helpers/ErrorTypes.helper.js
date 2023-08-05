/**
 * Base class for all custom error classes. Extends the
 * built-in `Error` class.
 *
 * @class
 * @extends Error
 * @param {string} message - The error message
 */
export class BaseError extends Error {
  constructor() {
    super();

    /**
     * The name of the error class.
     *
     * @type {string}
     */
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error class for email-related errors. Extends the `BaseError` class.
 *
 * @class
 * @extends BaseError
 * @param {string} type - The error type.
 */
export class EmailError extends BaseError {
  constructor(type) {
    super();

    /**
     * Types:
     * - 'NotVerified' -> The user has not verified their email.
     * - 'FailedToSend' -> The server fails to send the email to the user.
     */
    this.type = type;
  }
}

/**
 * Error class for authetication errors. Extends the `BaseError` class.
 *
 * @class
 * @extends BaseError
 */
export class AuthenticationError extends BaseError {
  constructor() {
    super();
  }
}

/**
 * Error class for social media authentication errors. Extends the `BaseError` class.
 *
 * @class
 * @extends BaseError
 * @param {string} details - Additional information about the error.
 *
 * Error occurence:
 * - If the email is already being used.
 * - Any other error that could occur during the social-media
 * account selection.
 */
export class SocialMediaAuthenticationError extends BaseError {
  constructor(details) {
    super();

    this.details = details || null;
  }
}

/**
 * Error class for verification code errors. Extends the `BaseError` class.
 *
 * @class
 * @extends BaseError
 * @param {string} type - The error type.
 */
export class VerificationCodeError extends BaseError {
  constructor(type) {
    super();

    /**
     * The type of the email error.
     *
     * Types:
     * - 'Expired' -> The verification code has expired.
     * - 'Invalid' -> The verification code the user entered is invalid.
     *
     * @type {string}
     */
    this.type = type || null;
  }
}

export class UserNotFoundError extends BaseError {
  constructor() {
    super();
  }
}
