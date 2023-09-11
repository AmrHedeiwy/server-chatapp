import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import errorsJson from '../../config/errors.json' assert { type: 'json' };
import { MulterError } from 'multer';

/**
 * Error middleware for handling and formatting errors in the application.
 * @param {Error} error - The error object.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const errorMiddleware = (error, req, res, next) => {
  // Check if the error object has a getResponse method
  if (error.getResponse) {
    const { status, message, redirect } = error.getResponse();

    // If redirect is specified, flash the message and redirect the response
    if (redirect) {
      req.flash('error', message);
      return res.status(status).redirect(redirect);
    }

    // If no redirect URL, return JSON response with error details
    return res.status(status).json({
      name: error.name,
      // Ensure that the message is an object
      details: message instanceof Object ? message : { message }
    });
  } else if (error instanceof MulterError) {
    const status = errorsJson.server.Image.status;
    const message = errorsJson.server.Image.messages.FileToLarge;

    return res
      .status(status)
      .json({ type: 'MulterError', details: { message } });
  }

  // If the error object does not have getResponse method, log the error
  console.error(error);

  // Set the default status and message for server errors
  const status = errorsJson.server.Unexpected.status;
  const message = errorsJson.server.Unexpected.message;

  // Return JSON response with default server error details
  res.status(status).json({ type: 'ServerError', details: { message } });
};
export default errorMiddleware;
