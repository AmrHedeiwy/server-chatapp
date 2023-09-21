import passport from 'passport';
import jwt from 'jsonwebtoken';
import { registerService } from '../services/auth/index.service.js';
import validation from '../middlewares/validation.middleware.js';
import mailerService from '../services/auth/mailer.service.js';
import {
  registerSchema,
  signInSchema,
  resetPasswordSchema,
  forgotPasswordRequestSchema
} from '../validations/auth.validation.js';
import { setNewPassword } from '../services/auth/register.service.js';
import {
  ipRateLimiter,
  emailRateLimiter,
  emailSkipSucessRequest
} from '../middlewares/rate-limit.middleware.js';
import { resetPasswordDecoder } from '../middlewares/token-decoder.middlware.js';
import { ResetPasswordError } from '../helpers/ErrorTypes.helper.js';

/**
 * Route handler for registering a user.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - Firstname: The first name of the user.
 * - Lastname: The last name of the user.
 * - Username: The username of the user.
 * - Email: The email address of the user.
 * - Password: The password of the user.
 * - ConfirmPassword: The re-entered password.
 *
 * This route performs the following steps:
 * 1. Applies IP rate limiting using the ipRateLimiter middleware to prevent abuse.
 * 2. Validates the request body at the validation middleware using the Joi registerSchema.
 * 3. Adds the new user to the database using the addUser function.
 * 4. Sends a verification code to the user's email for email verification using the beforeSave() hook in the User model.
 * 5. If an error occurs during the saving process, it will be passed to the error handling middleware.
 * 6. If the saving process is successful, a success flash message is stored in the req.flash object.
 * 7. A needsVerification property is populated in the session with the following properties: 'Email', 'Firstname'.
 * 8. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const register = [
  ipRateLimiter,
  validation(registerSchema),
  async (req, res, next) => {
    const body = req.body;

    const { status, message, redirect, user, error } =
      await registerService.addUser(body);

    if (error) return next(error);

    /**
     * Populate the needsVerification object in the session.
     *
     * The needsVerification object is needed for the following reasons:
     * - To allow the user to access the email-verification.html page.
     * - To display the user's email in the email-verification.html page.
     * - To display the user's first name in the email-verification.html page.
     * - To use the email and the first name when resending the verifiaction code to the email.
     * - To use the email as the key when searching in the redis store in order to validate the verification code.
     */
    req.session.needsVerification = {
      Email: user.Email,
      Firstname: user.Firstname
    };

    req.flash('success', message);

    res.status(status).redirect(redirect);
  }
];

/**
 * Route handler for sending verification code for email-verification.
 *
 * This route expects a POST request with the following parameters in the request:
 * - Firstname: The first name of the user.
 * - Email: The email address to verify.
 *
 * These parameters are extracted from the follwoing:
 * - 'req.session.needsVerification' : It may exist if the user just registered an account, resent the email verification code,
 * or changed their email.
 *
 * This route performs the following steps:
 * 1. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 2. Sends the new verification code to the user's email using the sendVerificaitonCode function.
 * 3. If an error occurs during the saving process, it will be passed to the error handling middleware.
 * 4. If the emailing process is successful, a needsVerification property is populated to the session with the following properties:
 * 'Email', 'Firstname'.
 * 5. Finally, the response is sent with the appropriate status code and message.
 */
export const emailVerificationRequest = [
  emailRateLimiter,
  async (req, res, next) => {
    const { Firstname, Email } = req.session?.needsVerification;

    const { message, status, error } =
      await registerService.sendVerificationCode(Firstname, Email);
    if (error) return next(error);

    /**
     * The needsVerification object is needed for the following reasons:
     * - To allow the user to access the email-verification.html page.
     * - To display the user's email in the email-verification.html page.
     * - To display the user's first name in the email-verification.html page.
     * - To use the email and the first name when resending the verifiaction code to the email.
     * - To use the email as the key when searching in the redis store in order to validate the verification code.
     */
    req.session.needsVerification = {
      Email,
      Firstname
    };

    res.status(status).json(message);
  }
];

/**
 * Route handler for verifing the user's email.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - VerificationCode: The 6-digit verification code to verify the email.
 *
 * It also requires the following additional parameters:
 * - Firstname: The first name of the user.
 * - Email: The email address to verify.
 *
 * These additional parameters are extracted from the following:
 * - 'req.session.needsVerification' : It may exist if the user just registered an account, resent the email verification code,
 * or changed their email.
 *
 * This route performs the following steps:
 * 1. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 2. Validates the verification code and updates their verification status to the database using the verifyEmail function.
 * 3. If an error occurs during the verification process, it will be passed to the error handling middleware.
 * 4. If the verificaiton is successful, we delete the needsVerification object from the session to prevent further access
 * to the email verification page.
 * 5. A success flash message is stored in the req.flash object.
 * 6. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const emailVerification = [
  emailRateLimiter,
  async (req, res, next) => {
    const { VerificationCode } = req.body;

    const Email = req.session?.needsVerification.Email;

    const { message, status, redirect, error } =
      await registerService.verifyEmail(Email, VerificationCode);

    if (error) return next(error);

    delete req.session.needsVerification;

    req.flash('success', message);

    // Redirect the user to the specified URL
    res.status(status).redirect(redirect);
  }
];

/**
 * Route handler for retrieving authentication information based on the requested page.
 *
 * This route expects a GET request and expects the page name as a parameter in the URL.
 *
 * The available pages and their corresponding behaviors are as follows:
 *
 * 1. 'sign-in':
 *    - If the user is already signed in, it redirects to the chat page.
 *    - If the user needs to verify their email, it redirects to the email verification page.
 *    - If there are flash messages in the session, it returns them as a JSON response and clears the session.
 *    - If there are no flash messages, it returns a JSON response indicating there are no flash messages.
 *
 * 2. 'email-verification':
 *    - If email verification is not required, it redirects to the sign-in page with a 401 status code.
 *    - If there are flash messages in the session, it returns them as a JSON response and clears the session.
 *    - It extracts the first name and email from the session, masks the email, and returns a JSON response with the masked email, first name, and flash messages.
 *
 * 3. 'reset-password':
 *    - If the reset password session data is not available, it redirects to the sign-in page with a 401 status code.
 *
 * 4. 'forgot-password':
 *    - It gets flash messages from the session, returns them as a JSON response, and clears the session.
 */
export const getAuthInfo = async (req, res, next) => {
  const { Page } = req.params;

  // Sign in
  if (Page == 'sign-in') {
    // Redirect to their chat page if the user is signed in.
    if (req.isAuthenticated()) return res.redirect('/chat.html');

    // Redirect to email verification page if the user needs to verify their email
    if (req.session.needsVerification)
      return res.redirect('/email-verification.html');

    const flashMessages = req.session.flash;

    if (flashMessages) {
      // Destroy the session to clear flash messages.
      req.session.destroy();
      return res.json(flashMessages);
    }

    // Send a JSON response indicating that there are no flash messages
    res.json(false);
  }

  // Email verificaiton
  else if (Page == 'email-verification') {
    // Redirect to sign-in page if email verification is not needed
    if (!req.session.needsVerification)
      return res.status(401).redirect('/sign-in.html');

    const flashMessages = req.session.flash;
    delete req.session.flash;

    let { Firstname, Email } = req.session.needsVerification;

    // Extract the username and domain from the email
    const [username, domain] = Email.split('@');

    // Mask the username by replacing middle characters with asterisks
    const maskedUsername =
      username.charAt(0) +
      '*'.repeat(username.length - 2) +
      username.charAt(username.length - 1);

    /**
     * Create a masked email by combining the masked username and domain
     * @example Email: 'example@gmail.com' -> Masked: 'e*****e@gmail.com'
     */
    const maskedEmail = `${maskedUsername}@${domain}`;

    res.status(200).json({
      Email: maskedEmail,
      Firstname,
      FlashMessages: flashMessages
    });
  }

  // reset password
  else if (Page == 'reset-password') {
    if (!req.session.resetPassword) return next(new ResetPasswordError());
  }

  // forgot password
  else if (Page == 'forgot-password') {
    const flashMessages = req.session.flash;
    delete req.session.flash;

    res.json({ FlashMessages: flashMessages });
  }
};

/**
 * Route handler for initiating a password reset request.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - Email: The email address to send the request to.
 *
 * This route performs the following steps:
 * 1. Applies IP rate limiting using the ipRateLimiter middleware to prevent abuse.
 * 1. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 1. Checks if the user with the provided email exists using the checkUserExists function.
 * 2. If an error occurs during the search process, it will be passed to the error handling middleware.
 * 3. If the user is found, a JWT token is generated with the user's ID to expire in 15 minutes and used as the token in the URL.
 * 4. Sends a reset password link to the user's email.
 * 5. If an error occurs during the emailing process, it will be passed to the error handling middleware.
 * 6. If the emailing process is successful, a resetPassword property is added to the session.
 * 7. Finally, the response is sent with the appropriate status code and message.
 */
export const forgotPasswordRequest = [
  ipRateLimiter,
  emailRateLimiter,
  validation(forgotPasswordRequestSchema),
  async (req, res, next) => {
    const { Email } = req.body;

    const { user, error } = await registerService.checkUserExists(
      'Email',
      Email
    );
    if (error) return next(error);

    const useridToken = jwt.sign(
      {
        UserID: user.UserID
      },
      'mysec',
      { expiresIn: '1h' }
    );

    const { message, status, failed } = await mailerService(
      'reset-password',
      user.Firstname,
      Email,
      {
        useridToken
      }
    );
    if (failed) return next(failed);

    // To allow the user to access the reset-password.html page.
    req.session.resetPassword = true;

    res.status(status).json(message);
  }
];

/**
 * Route handler for resetting a user's password.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - UserID: The user's ID to identify the user from the database.
 * - NewPassword: The new password to set for the user.
 *
 * This route performs the following steps:
 * 1. Applies IP rate limiting using the ipRateLimiter middleware to prevent abuse.
 * 2. Decodes the reset password information using the resetPasswordDecoder middleware.
 * 3. Validates the request body parameters against the resetPasswordSchema using the validation middleware.
 * 4. Calls the setNewPassword function to set the new password for the user, providing the UserID and NewPassword.
 * 5. If an error occurs during the password reset process, it is passed to the error handling middleware.
 * 6. If the password reset is successful, a success flash message is stored in the req.flash object.
 * 7. The resetPassword property in the session is deleted to prevent the user from visiting the page again.
 * 8. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const resetPassword = [
  ipRateLimiter,
  resetPasswordDecoder,
  validation(resetPasswordSchema),
  async (req, res, next) => {
    const { UserID, NewPassword } = req.body;

    const { message, redirect, status, error } = await setNewPassword(
      UserID,
      NewPassword
    );
    if (error) return next(error);

    req.flash('success', message);
    delete req.session.resetPassword;

    res.status(status).redirect(redirect);
  }
];

/**
 * Route handler for user sign-in using local strategy.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - Email: The email address of the user.
 * - Password: The password of the user.
 *
 * This route performs the following steps:
 * 1. Validates the request body using the Joi signInSchema.
 * 2. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 3. Applies the skipEmailRequest middleware to skip rate limiting for successful requests.
 * 3. Authenticates the user using the Passport Local Strategy.
 * 4. If an error occurs during the authentication process, it will be passed to the error handling middleware.
 * 5. If the authentication is successful, the req.login method provided by PassportJS is called to sign in the user.
 * 6. If the process is successful, the response is sent with the appropriate status code and redirect URL.
 */
export const signIn = [
  validation(signInSchema),
  emailRateLimiter,
  emailSkipSucessRequest,
  async (req, res, next) => {
    passport.authenticate(
      'local',
      { passReqToCallback: true },
      async (err, user, info) => {
        if (err) return next(err);

        /**
         * Add a passport object to the session containing the user's UserID.
         * @example passport { user: UserID: '<UUID>' }
         */
        req.logIn(user, (err) => {
          if (err) return next(err);

          res.status(info.status).redirect(info.redirect);
        });
      }
    )(req, res, next);
  }
];

/**
 * Initiates the Facebook sign-up process by authenticating the user using the 'facebook' strategy with specified scopes.
 *
 * Scopes: 'email'
 */
export const facebookSignUp = passport.authenticate('facebook', {
  scope: ['email']
});

/**
 * Route handler for facebook sign-up callback function that authenticates the user using the 'facebook' strategy.
 *
 * This route performs the following steps:
 * 1. If an error occurs during the authentication process, it will be passed to the error handling middleware.
 * 2. If the authentication is successful, we call the req.login method provided by PassportJS to sign in the user.
 * 3. If the process is successful, a success flash message is stored in the req.flash object.
 * 4. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const facebookSignUpCallback = async (req, res, next) => {
  passport.authenticate(
    'facebook',
    { passReqToCallback: true },
    async (err, user, info) => {
      if (err) return next(err);

      /**
       * Add a passport object to the session containing the user's UserID.
       * @example passport { user: UserID: '<UUID>' }
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
 *
 * Scopes: 'email', 'profile'
 */
export const googleSignUp = passport.authenticate('google', {
  scope: ['email', 'profile']
});

/**
 * Route handler for google sign-up callback function that authenticates the user using the 'google' strategy.
 *
 * This route performs the following steps:
 * 1. If an error occurs during the authentication process, it will be passed to the error handling middleware.
 * 2. If the authentication is successful, we call the req.login method provided by PassportJS to sign in the user.
 * 3. If the process is successful, a success flash message is stored in the req.flash object.
 * 4. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const googleSignUpCallback = async (req, res, next) => {
  passport.authenticate(
    'google',
    { passReqToCallback: true },
    async (err, user, info) => {
      if (err) return next(err);

      /**
       * Add a passport object to the session containing the user's UserID.
       * @example passport { user: UserID: '<UUID>' }
       */
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
  emailVerificationRequest,
  emailVerification,
  forgotPasswordRequest,
  resetPassword,
  signIn,
  facebookSignUp,
  facebookSignUpCallback,
  googleSignUp,
  googleSignUpCallback,
  getAuthInfo
};
