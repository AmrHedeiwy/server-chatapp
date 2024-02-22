// import dotenv from 'dotenv';
// dotenv.config({ path: './src/config/.env' });

import errorsJson from '../../config/errors.json' assert { type: 'json' };

/**
 * Error middleware for handling and formatting errors in the application.
 */
const errorMiddleware = (error, req, res, next) => {
  // Errors with no getResponse methods are server errors
  if (!!error.getResponse) {
    const { status, message, redirect } = error.getResponse();

    if (error.name === 'SocialMediaAuthenticationError') {
      console.error(`${error.provider} AUTH ERROR `, {
        details: error.details
      });

      req.session.isCallbackProvider = true;

      return res.status(status).redirect(process.env.CLIENT_URL + redirect);
    }

    return res.status(status).json({
      error: {
        name: error.name,
        message,
        ...(redirect ? { redirect } : {})
      }
    });
  }

  // If the error object does not have getResponse method, log the error
  console.error(error);

  // Set the default status and message for unexpected errors
  const status = errorsJson.status.unexpected;
  const message = errorsJson.server.unexpected.message;

  // Return JSON response with default unexpected error details
  res.status(status).json({ error: { type: 'UnexpectedError', message } });
};

export default errorMiddleware;
