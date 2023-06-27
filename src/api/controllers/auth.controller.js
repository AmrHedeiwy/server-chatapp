import passport from 'passport';
import { registerService } from '../services/index.js';
import validation from '../middlewares/validation.middleware.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';

/**
 * Registers a new user in the system.
 *
 * @function register
 * @access Public
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
export const register = [
  // Middleware function that validates the request body against the Joi schema.
  validation(registerSchema),
  // Route handler that creates a new user using the request body.
  async (req, res, next) => {
    const body = req.body;

    const { status, message, errors } = await registerService.registerUser(
      body
    );

    // If there are any errors returne, pass it to the error handling middleware.
    if (errors) return next(errors);

    // Otherwise, set the response status to the status returned by createUser and send the message to the client as JSON.
    res.status(status).json(message);
  }
];

/**
 * Handles email verification requests.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
export const emailVerification = [
  async (req, res, next) => {
    // Extracting the verification token from the request parameters.
    const token = req.params.token;

    // Passing the token to the function call.
    const result = await registerService.verifyEmail(token);

    // If the result contains an error property, pass it to the error handling middleware.
    if (result?.error) return next(result.error);

    // If the verification is successful, we redirect the user to the login page.
    res.redirect(process.env.CLIENT_URl);
  }
];

export const login = [
  validation(loginSchema),
  passport.authenticate('local', {
    failureMessage: 'failed',
    successMessage: 'success'
  })
];

export default {
  login,
  register,
  emailVerification
};
