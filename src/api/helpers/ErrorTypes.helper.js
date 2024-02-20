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
 * Represents an error that occurs when a user fails to sign in due to incorrect email or password.
 *
 * @extends BaseError
 */
export class SignInError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code and message.
   *
   * @returns {object} - The response containing the status code and message.
   */
  getResponse() {
    return {
      message: errorsJson.auth.sign_in.local_message,
      status: errorsJson.status.invalid_request
    };
  }
}

/**
 * Represents an error that occurs when the server fails to send the email to the user.
 *
 * @extends BaseError
 */
export class MailerError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code, message, and redirect URL.
   *
   * @returns {object} - The response containing the status code, message, and redirect URL.
   */
  getResponse() {
    return { ...errorsJson.auth.mailer, status: errorsJson.status.unexpected };
  }
}

/**
 * Represents an error that occurs with social media authentication.
 *
 * @extends BaseError
 */
export class SocialMediaAuthenticationError extends BaseError {
  /**
   * Create a SocialMediaAuthenticationError.
   *
   * @param {string} details - Additional details about the error.
   * @param {string} provider - The social media provider (e.g., 'local', 'google', 'facebook').
   */
  constructor(details, provider) {
    super();

    this.details = details || null;
    this.provider = provider;
  }

  /**
   * Returns the response containing the status code and redirect URL.
   *
   * @returns {object} - The response containing the status code and redirect URL.
   */
  getResponse() {
    const status = errorsJson.status.unexpected;
    const redirect =
      errorsJson.auth.sign_in[
        this.provider === 'local'
          ? `${this.provider}_message`
          : `${this.provider}_redirect`
      ];

    return { status, redirect };
  }
}

/**
 * Represents an error that occurs during verification code validation.
 *
 * @extends BaseError
 */
export class VerificationCodeError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code and message.
   *
   * @returns {object} - The response containing the status code and message.
   */
  getResponse() {
    return {
      ...errorsJson.auth.verification_code,
      status: errorsJson.status.invalid_request
    };
  }
}

/**
 * Represents an error that occurs when the user attempts to request a password reset link for an account that is not registered by email (Local strategy).
 *
 * @extends BaseError
 */
export class ForgotPassswordError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code, message, and redirect URL.
   *
   * @returns {object} - The response containing the status code, message, and redirect URL.
   */
  getResponse() {
    return {
      ...errorsJson.auth.password.forgot,
      status: errorsJson.status.invalid_request
    };
  }
}

/**
 * Represents an error that occurs during verification of the JWT token at the resetPasswordDecoder middleware.
 *
 * @extends BaseError
 */
export class ResetPasswordError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code, message, and redirect URL.
   *
   * @returns {object} - The response containing the status code, message, and redirect URL.
   */
  getResponse() {
    return {
      ...errorsJson.auth.password.reset,
      status: errorsJson.status.invalid_request
    };
  }
}

/**
 * Represents an error that occurs when a user is not found in the database.
 *
 * @extends BaseError
 */
export class UserNotFoundError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code and message.
   *
   * @returns {object} - The response containing the status code and message.
   */
  getResponse() {
    return {
      ...errorsJson.auth.user_not_found,
      status: errorsJson.status.not_found
    };
  }
}

/**
 * Represents an error that occurs when the user exceeds the number of requests for a specific route.
 *
 * @extends BaseError
 */
export class RateLimitError extends BaseError {
  /**
   * Create a RateLimitError.
   *
   * @param {string} route - The route associated with the rate limit error.
   * @example '/sign-in', '/email/verifiy'
   */
  constructor(route) {
    super();
    this.route = route;
  }

  /**
   * Returns the response containing the status code and message.
   *
   * @returns {object} - The response containing the status code and message.
   */
  getResponse() {
    const message = errorsJson.server.rate_limit[this.route];
    const status = errorsJson.status.too_many_requests;

    return { status, message };
  }
}

/**
 * Represents an error that occurs due to validation failure using a Joi Schema.
 *
 * @extends BaseError
 */
export class JoiValidationError extends BaseError {
  /**
   * Create a JoiValidationError.
   *
   * @param {Array} details - The validation error details.
   * @param {string} source - The source of the validation error ('auth' or 'main').
   */
  constructor(details, source) {
    super();
    this.details = details;
    this.source = source;
  }

  /**
   * Returns the response containing the status code and validation error messages.
   *
   * @returns {object} - The response containing the status code and validation error messages.
   */
  getResponse() {
    let message;
    const status = errorsJson.status.invalid_request;

    message = this.details.reduce((acc, err) => {
      const label = err.label;
      const code = err.code;
      let fieldMessage;

      if (code === 'string.empty' || code === 'any.required') {
        fieldMessage = 'Required';
      } else {
        fieldMessage = errorsJson[this.source].validations[label];
      }

      acc.push({ fieldName: label, fieldMessage });
      return acc;
    }, []);

    return { status, message };
  }
}

/**
 * Represents an error that occurs due to a constraint violation in Sequelize.
 *
 * @extends BaseError
 */
export class SequelizeConstraintError extends BaseError {
  /**
   * Create a SequelizeConstraintError.
   *
   * @param {sequelize.UniqueConstraintError} details - The details of the constraint error.
   */
  constructor(details) {
    super();
    this.details = details;
  }

  /**
   * Returns the response containing the status code and error message.
   *
   * @returns {object} - The response containing the status code and error message.
   */
  getResponse() {
    const message = errorsJson.auth.constraints.email;
    const status = errorsJson.status.unprocessable_entity;

    return { status, message };
  }
}

/**
 * Represents an error that occurs when data is missing from a request that
 * is not the user's fault.
 *
 * @extends BaseError
 */
export class MissingSystemDataError extends BaseError {
  constructor(message, values) {
    super();

    this.message = message;
    this.values = values;
  }
}

/**
 * Represents an error that occurs when the current password does not match the password stored in the database (Sequelize).
 *
 * @extends BaseError
 */
export class ChangePasswordError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code and error message.
   *
   * @returns {object} - The response containing the status code and error message.
   */
  getResponse() {
    return {
      ...errorsJson.main.user.change_password,
      status: errorsJson.status.invalid_request
    };
  }
}

/**
 * Represents an error that occurs when the prompted email does not match the user's email.
 *
 * @extends BaseError
 */
export class DeleteAccountError extends BaseError {
  constructor() {
    super();
  }

  /**
   * Returns the response containing the status code and error message.
   *
   * @returns {object} - The response containing the status code and error message.
   */
  getResponse() {
    return {
      ...errorsJson.main.user.delete_account,
      status: errorsJson.status.invalid_request
    };
  }
}
