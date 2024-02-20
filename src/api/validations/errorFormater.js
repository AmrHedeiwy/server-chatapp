import Joi from 'joi';
import { JoiValidationError } from '../helpers/ErrorTypes.helper.js';

/**
 * Formats Joi validation errors into a custom error format.
 *
 * This function takes an array of Joi validation errors and formats them into
 * an array of objects containing the error code and label.
 *
 * @param {Joi.ValidationErrorItem[]} errors - Array of Joi validation errors.
 * @returns {JoiValidationError} Custom error object containing formatted errors.
 */
export function authErrorFormatter(errors) {
  const formattedError = errors.reduce((acc, err) => {
    /**
     * Pushes the error code and label to the array.
     *
     * @example acc.push({ code: 'string.empty', label: 'email' })
     */
    acc.push({ code: err.code, label: err.local.label });

    return acc;
  }, []);

  return new JoiValidationError(formattedError, 'auth');
}

export function mainErrorFormatter(errors) {
  const formattedError = errors.reduce((acc, err) => {
    /**
     * Pushes the error code and label to the array.
     *
     * @example acc.push({ code: 'string.empty', label: 'email' })
     */
    acc.push({ code: err.code, label: err.local.label });

    return acc;
  }, []);

  return new JoiValidationError(formattedError, 'main');
}
