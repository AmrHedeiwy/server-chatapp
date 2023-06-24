export class BaseError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class EmailVerificationError extends BaseError {
  constructor(message, type, errors) {
    super(message);
    this.type = type;
    this.errors = errors || null;
  }
}
