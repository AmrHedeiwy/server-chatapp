import passport from 'passport';
import { registerService } from '../services/auth/index.service.js';
import validation from '../middlewares/validation.middleware.js';
import {
  registerSchema,
  signInSchema
} from '../validations/auth.validation.js';

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

    const { status, message, redirect, errors } =
      await registerService.registerUser(body);

    // If there are any errors returne, pass it to the error handling middleware.
    if (errors) return next(errors);

    req.flash('success', message);
    // Otherwise, set the response status to the status returned by createUser and send the message to the client as JSON.
    res.status(status).redirect(redirect);
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

/**
 * Checks if the user is already signed in or has any flash messages.
 *
 * @function Sign in check
 * @access Public
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
export const signInCheck = (req, res, next) => {
  // Check if user is signed in
  if (req.user) {
    return res.redirect('/chat.html');
  }

  const flashMessages = req.session.flash;

  // Check if user has any flash messages
  if (flashMessages) {
    req.session.destroy();
    return res.json(flashMessages);
  }

  res.json(false);
};

/**
 * sign in a new user in the system.
 *
 * @function Sign in
 * @access Public
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 */
export const signIn = [
  // Middleware function that validates the request body against the Joi schema.
  validation(signInSchema),
  // Route handler that signs in a user using the request body.
  async (req, res, next) => {
    passport.authenticate(
      'local',
      { passReqToCallback: true },
      async (err, user, info) => {
        // Handle invalid email or password errors.
        if (err) return next(err);

        /**
         * Authrntication successded.
         *
         * Add a passport object to the session
         * containing the user's UserID.
         * @example passport { user: UserID: <UUID> }
         *
         * Adds a user property to the request object.
         * @example { UserID: <UUID> }
         */
        req.login(user, (err) => {
          // Handle error.
          if (err) return next(err);

          // Adding the success message to the flash object.
          req.flash('success', info.message);

          // Redirect the user to their chat.
          res.status(info.status).redirect(info.redirect);
        });
      }
    )(req, res, next);
  }
];

export const facebookSignUp = passport.authenticate('facebook', {
  scope: ['email']
});

export const facebookSignUpCallback = [
  async (req, res, next) => {
    passport.authenticate(
      'facebook',
      { failureRedirect: '/login', passReqToCallback: true },
      async (err, user, info) => {
        // Handle invalid email or password errors.
        if (err) return next(err);

        /**
         * Authrntication successded.
         *
         * Add a passport object to the session
         * containing the user's UserID.
         * @example passport { user: UserID: <UUID> }
         *
         * Adds a user property to the request object.
         * @example { UserID: <UUID> }
         */
        req.login(user, (err) => {
          // Handle error.
          if (err) return next(err);

          // Adding the success message to the flash object.
          req.flash('success', info.message);

          // Redirect the user to their chat.
          res.status(info.status).redirect(info.redirect);
        });
      }
    )(req, res, next);
  }
];
export default {
  register,
  emailVerification,
  signInCheck,
  signIn,
  facebookSignUp,
  facebookSignUpCallback
};
