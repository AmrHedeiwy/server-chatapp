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
 * Error class for email verification-related errors. Extends the `BaseError` class.
 *
 * @class
 * @extends BaseError
 * @param {string} type - The error type.
 * @param {Object|null} errors - Additional error detials.
 */
export class EmailVerificationError extends BaseError {
  constructor(type, errors) {
    super();

    /**
     * The type of the email verification error.
     *
     * @type {string}
     */
    this.type = type;

    /**
     * Additonal error details, if any.
     *
     * @type {Object|null}
     */
    this.errors = errors || null;
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
 */
export class SocialMediaAuthenticationError extends BaseError {
  constructor(details) {
    super();
    this.details = details || null;
  }
}
