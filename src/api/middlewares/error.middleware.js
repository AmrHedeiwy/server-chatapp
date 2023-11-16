import dotenv from 'dotenv';
dotenv.config({ path: './src/config/.env' });

import errorsJson from '../../config/errors.json' assert { type: 'json' };
import { MulterError } from 'multer';

/**
 * Error middleware for handling and formatting errors in the application.
 * @param {Error} error - The error object.
 * @param {Express.Request} req - The request object.
 * @param {Express.Response} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const errorMiddleware = (error, req, res, next) => {
  // Check if the error object has a getResponse method
  if (error.getResponse) {
    const { status, message, redirect } = error.getResponse();

    if (error.name === 'SocialMediaAuthenticationError') {
      console.error(error);
      req.session.isCallbackProvider = true;

      return res.status(status).redirect(process.env.CLIENT_URL + redirect);
    }

    return res.status(status).json({
      error: {
        name: error.name,
        message,
        ...(redirect ? { redirect } : null)
      }
    });
  } else if (error instanceof MulterError) {
    const status = errorsJson.image.status;
    const message = errorsJson.image.messages['file-to-large'];

    return res.status(status).json({ error: { name: 'MulterError', message } });
  }

  // If the error object does not have getResponse method, log the error
  console.error(error);

  // Set the default status and message for unexpected errors
  const status = errorsJson.unexpected.status;
  const message = errorsJson.unexpected.message;

  // Return JSON response with default unexpected error details
  res.status(status).json({ error: { type: 'UnexpectedError', message } });
};

export default errorMiddleware;
