import passport from 'passport';
import jwt from 'jsonwebtoken';
import { registerService } from '../services/auth/index.service.js';
import validation from '../middlewares/validation.middleware.js';
import {
  registerSchema,
  signInSchema
} from '../validations/auth.validation.js';

/**
 * Registers a new user by validating the registration data, creating a user record,
 * and generating an email verification token.
 *
 * @param {Array} register - An array of middleware functions for user registration.
 * @returns {Array} - An array of middleware functions for user registration.
 */
export const register = [
  // Middleware function that validates the request body against the Joi schema.
  validation(registerSchema),
  /**
   * Middleware function for registering a new user.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   */
  async (req, res, next) => {
    const body = req.body;

    // Register the user and obtain the registration status, message, redirect URL, email, and errors.
    const { status, message, redirect, email, errors } =
      await registerService.registerUser(body);

    // If errors occurred during registration, pass them to the error-handling middleware.
    if (errors) return next(errors);

    // Store the user's email as a token, for security, in the session to display it to the user in email verification page.
    req.session.verification = {
      needsVerification: true,
      emailToken: await jwt.sign(email, 'mysec')
    };

    // Flash a success message.
    req.flash('success', message);

    // Redirect the user to the specified URL.
    res.status(status).redirect(redirect);
  }
];

/**
 * Checks if email verification is required for the current session.
 * It also checks for any flash messages to display to the user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void} - Returns nothing.
 */
export const emailVerificationCheck = async (req, res, next) => {
  // Check if email verification is required.
  if (!req.session.verification?.needsVerification) {
    // Redirect to sign-in page if verification is not needed.
    res.redirect('/sign-in.html');
  } else {
    // Verify the email token.
    let email = jwt.verify(req.session.verification.emailToken, 'mysec');

    // Extract the username and domain from the email.
    const [username, domain] = email.split('@');

    // Mask the username by replacing middle characters with asterisks.
    const maskedUsername =
      username.charAt(0) +
      '*'.repeat(username.length - 2) +
      username.charAt(username.length - 1);

    // Create a masked email by combining the masked username and domain.
    const maskedEmail = `${maskedUsername}@${domain}`;

    // Get flash messages from the session and delete them afterwards.
    const flashMessages = req.session.flash;
    delete req.session.flash;

    // Send a JSON response with the masked email and flash messages.
    res.json({ Email: maskedEmail, FlashMessages: flashMessages });
  }
};

/**
 * Handles the email verification process by validating the verification token
 * and verification code, and updating the user's verification status.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const emailVerification = async (req, res, next) => {
  const { Token, VerificationCode } = req.body;

  // Verify the token and obtain the user ID.
  const UserID = await jwt.verify(Token, 'mysec', async (err, decoded) => {
    if (err) next(err);
    return decoded;
  });

  // Verify the user's email and obtain the verification status, message, redirect URL, and error.
  const { message, status, redirect, error } =
    await registerService.verifyEmail(UserID, VerificationCode);

  // If an error occurred during email verification, pass it to the error-handling middleware.
  if (error) return next(error);

  // Delete the verification object from the session to prevent further access to the email verification page.
  delete req.session.verification;

  // Flash a success message.
  req.flash('success', message);

  // Redirect the user to the specified URL
  res.status(status).redirect(redirect);
};

/**
 * Checks if the user is already signed in and redirects them to their chat page if so.
 * It also checks for any flash messages to display to the user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void} - Returns nothing.
 */
export const signInCheck = (req, res, next) => {
  // Check if the user is already signed in.
  if (req.user) {
    // Redirect to the chat page if the user is signed in.
    return res.redirect('/chat.html');
  }
  // Get flash messages from the session.
  const flashMessages = req.session.flash;

  // Check if there are any flash messages.
  if (flashMessages) {
    // Destroy the session to clear flash messages.
    req.session.destroy();
    // Send the flash messages as a JSON response.
    return res.json(flashMessages);
  }

  // Send a JSON response indicating that there are no flash messages
  res.json(false);
};

/**
 * Authenticates a user by validating the sign-in data and using passport for authentication.
 *
 * @param {Array} signIn - An array of middleware functions for user sign-in.
 * @returns {Array} - An array of middleware functions for user sign-in.
 */
export const signIn = [
  // Middleware function that validates the request body against the Joi schema.
  validation(signInSchema),
  /**
   * Middleware function for user sign-in.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next middleware function.
   */
  async (req, res, next) => {
    // Use passport to authenticate the user.
    passport.authenticate(
      'local',
      { passReqToCallback: true },
      async (err, user, info) => {
        // Handle invalid email or password errors.
        if (err) return next(err);

        /**
         * Authentication success.
         *
         * Add a passport object to the session
         * containing the user's UserID.
         * @example passport { user: UserID: <UUID> }
         *
         * Adds a user property to the request object.
         * @example { UserID: <UUID> }
         */

        // Log in the user using req.login method provided by passport.
        req.login(user, (err) => {
          // Handle error.
          if (err) return next(err);

          // Flash a success message.
          req.flash('success', info.message);

          // Redirect the user to the specified URL.
          res.status(info.status).redirect(info.redirect);
        });
      }
    )(req, res, next);
  }
];

/**
 * Initiates the Facebook sign-up process by authenticating the user using the 'facebook' strategy with specified scopes.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void} - Returns nothing.
 */
export const facebookSignUp = passport.authenticate('facebook', {
  scope: ['email']
});

/**
 * Facebook sign-up callback function that authenticates the user using the 'facebook' strategy.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {void} - Returns nothing.
 */
export const facebookSignUpCallback = async (req, res, next) => {
  passport.authenticate(
    'facebook',
    { failureRedirect: '/auth/register', passReqToCallback: true },
    /**
     * Callback function after authenticating the user.
     *
     * @param {boolean} err - Indicates if there are any errors.
     * @param {object} user - The user's credentials.
     * @param {object} info - The information about the status code and the page the user is redirected to.
     * @returns {void} - Returns nothing.
     */
    async (err, user, info) => {
      if (err) return next(err);

      /**
       * Authentication successded.
       *
       * Add a passport object to the session
       * containing the user's UserID.
       * @example passport { user: UserID: <UUID> }
       *
       * Adds a user property to the request object containing all
       * the user's data except the password.
       * @example { UserID: <UUID>, Firstname: 'Amr', Lastname: 'Hedeiwy' }
       */
      req.login(user, (err) => {
        if (err) return next(err);

        req.flash('success', info.message);

        res.status(info.status).redirect(info.redirect);
      });
    }
  )(req, res, next);
};

/**
 * Initiates the Google sign-up process by authenticating the user using the 'google' strategy with specified scopes.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void} - Returns nothing.
 */
export const googleSignUp = passport.authenticate('google', {
  scope: ['email', 'profile']
});

/**
 * Google sign-up callback function that authenticates the user using the 'google' strategy.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {void} - Returns nothing.
 */
export const googleSignUpCallback = async (req, res, next) => {
  passport.authenticate(
    'google',
    { failureRedirect: '/auth/register', passReqToCallback: true },
    /**
     * Callback function after authenticating the user.
     *
     * @param {boolean} err - Indicates if there are any errors.
     * @param {object} user - The user's credentials.
     * @param {object} info - The information about the status code and the page the user is redirected to.
     * @returns {void} - Returns nothing.
     */
    async (err, user, info) => {
      if (err) return next(err);

      req.login(user, (err) => {
        if (err) return next(err);

        req.flash('success', info.message);

        res.status(info.status).redirect(info.redirect);
      });
    }
  )(req, res, next);
};

export default {
  register,
  emailVerification,
  emailVerificationCheck,
  signIn,
  signInCheck,
  facebookSignUp,
  facebookSignUpCallback,
  googleSignUp,
  googleSignUpCallback
};
