import passport from 'passport';
import jwt from 'jsonwebtoken';

import validation from '../middlewares/validation.middleware.js';
import {
  ipRateLimiter,
  emailRateLimiter,
  emailSkipSucessRequest
} from '../middlewares/rate-limit.middleware.js';
import { isAuthExpress } from '../middlewares/auth.middleware.js';
import { resetPasswordDecoder } from '../middlewares/token-decoder.middlware.js';

import { registerService } from '../services/auth/index.service.js';
import mailerService from '../services/auth/mailer.service.js';
import { setResetPassword } from '../services/auth/register.service.js';

import {
  registerSchema,
  signInSchema,
  resetPasswordSchema,
  forgotPasswordRequestSchema
} from '../validations/auth.validation.js';

import {
  ForgotPassswordError,
  SocialMediaAuthenticationError
} from '../helpers/ErrorTypes.helper.js';

/**
 * Route handler for registering a user.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - username
 * - email
 * - password
 * - confirmPassword
 *
 * This route performs the following steps:
 * 1. Applies IP rate limiting using the ipRateLimiter middleware to prevent abuse.
 * 2. Validates the request body at the validation middleware using the Joi registerSchema.
 * 3. Adds the new user to the database using the addUser function.
 * 4. Sends a verification code to the user's email for email verification using the beforeSave() hook in the User model.
 * 5. If an error occurs during the saving process, it will be passed to the error handling middleware.
 * 6. If the saving process is successful, it will add a session for the user using the login() method provided by PassportJS and redirect the
 * user to the email verification page with an appropriate message. (The user will not be able to visit protected routes since their account has not been
 * verified yet)
 */
export const register = [
  ipRateLimiter,
  validation(registerSchema),
  async (req, res, next) => {
    const body = req.body;

    const { status, message, redirect, user, error } =
      await registerService.addUser(body);

    if (error) return next(error);

    req.login(user.userId, (err) => {
      if (err) return next(err);

      res.status(status).json({ message, redirect });
    });
  }
];

/**
 * Route handler for sending verification code for email-verification.
 *
 * This route expects a POST request with the following parameters in the request user:
 * - username: Used in the email context.
 * - email: The email address to send the verification code.
 * - userId: The key to set for the verification code when storing in the cache (redis).
 *
 * This route performs the following steps:
 * 1. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 2. Sends the new verification code to the user's email using the sendVerificaitonCode function.
 * 3. If an error occurs during the saving process, it will be passed to the error handling middleware.
 * 4. If the emailing process is successful, the user is redirected to the email verification page with an appropriate message.
 */
export const verifyEmailRequest = [
  isAuthExpress,
  emailRateLimiter,
  async (req, res, next) => {
    const { username, email, userId } = req.user;

    const { message, redirect, status, error } =
      await registerService.sendVerificationCode(username, email, userId);
    if (error) return next(error);

    res.status(status).json({ message, redirect });
  }
];

/**
 * Route handler for verifing the user's email.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - verificationCode: The 6-digit verification code to verify the email.
 *
 * It also requires the following additional parameters from the request user:
 * - userId: Used to query from the cache and the database.
 *
 * This route performs the following steps:
 * 1. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 2. Validates the verification code and updates their verification status to the database using the verifyEmail function.
 * 3. If an error occurs during the verification process, it will be passed to the error handling middleware.
 * 4. If the verificaiton is successful, the user is redirected to the users page with an appropriate message.
 */
export const verifyEmail = [
  isAuthExpress,
  emailRateLimiter,
  async (req, res, next) => {
    const { verificationCode } = req.body;

    const { userId } = req.user;

    const { status, message, redirect, error } =
      await registerService.verifyEmail(userId, verificationCode);

    if (error) return next(error);

    res.status(status).json({ message, redirect });
  }
];

/**
 * Route handler for retrieving authentication information based on the type.
 *
 * This route expects a GET request and expects the page name as a parameter in the URL.
 *
 * Possble types:
 * - authorisation : For protected routes.
 * - session : The user's session.
 */
export const getAuthInfo = async (req, res, next) => {
  const { type } = req.params;

  if (type === 'authorisation') {
    const isCallbackProvider = req.session.isCallbackProvider ?? false;

    delete req.session.isCallbackProvider;

    return res.json({
      isAuth: req.isAuthenticated(),
      isVerified: req.user?.isVerified ?? false,
      isPasswordReset: req.session.passwordReset ?? false,
      isCallbackProvider
    });
  }

  if (type === 'session') {
    return res.json({
      user: req?.user
        ? {
            userId: req.user.userId,
            email: req?.user.email,
            isVerified: req.user.isVerified
          }
        : null
    });
  }
};

/**
 * Route handler for initiating a password reset request.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - email: The email address to send the request to.
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
    const { email } = req.body;

    const { user, error } = await registerService.checkUserExists(
      'email',
      email
    );
    if (error) return next(error);

    // Indicates that account is not created by email (local-strategy)
    if (!user.dataValues.password) return next(new ForgotPassswordError());

    const useridToken = jwt.sign(
      {
        userId: user.userId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const { message, status, failed } = await mailerService(
      'forgot-password',
      user.username,
      email,
      {
        useridToken
      }
    );
    if (failed) return next(failed);

    // To allow the user to access the reset-password.html page.
    req.session.passwordReset = true;
    req.session.save();

    res.status(status).json({ message });
  }
];

/**
 * Route handler for resetting a user's password.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - userId: The user's ID to identify the user from the database.
 * - newPassword: The new password to set for the user.
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
    const { userId, password } = req.body;

    const { message, redirect, status, error } = await setResetPassword(
      userId,
      password
    );
    if (error) return next(error);

    delete req.session.passwordReset;

    res.status(status).json({ message, redirect });
  }
];

/**
 * Route handler for user sign-in using local strategy.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - Email
 * - Password
 *
 * This route performs the following steps:
 * 1. Validates the request body using the Joi signInSchema.
 * 2. Applies Email rate limiting using the emailRateLimiter middleware to prevent abuse.
 * 3. Applies the skipEmailRequest middleware to skip rate limiting for successful requests.
 * 3. Authenticates the user using the Passport Local Strategy.
 * 4. If an error occurs during the authentication process, it will be passed to the error handling middleware.
 * 5. If the authentication is successful, the login() method provided by PassportJS is called to sign in the user.
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
      async (err, userId, info) => {
        if (err) return next(err);

        /**
         * Add a passport object to the session containing the user's userId.
         * @example passport { user: userId: '<UUID>' }
         */
        req.login(userId, async (err) => {
          if (err) return next(err);

          // Set the expire time of the cookie for 30 days if 'remember me' was selected
          if (req.body.rememberMe)
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;

          res.status(info.status).json({ redirect: info.redirect });
        });
      }
    )(req, res, next);
  }
];

/**
 * Route handler for user sign-out.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Logs out the user by calling the logout() provided by PassportJS and redirects the user to login/register page.
 */
export const signOut = [
  isAuthExpress,
  (req, res, next) => {
    req.logout((options, done) => {
      req.session.destroy(); // To prevent new session getting stored in redis
      res.status(200).json({ redirect: '/' });
    });
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
 * 2. If the authentication is successful, we call the login() method provided by PassportJS and redirect the
 * user to the success page.
 */
export const facebookSignUpCallback = async (req, res, next) => {
  passport.authenticate(
    'facebook',
    { passReqToCallback: true },
    async (err, userId, info) => {
      if (err) return next(new SocialMediaAuthenticationError(err, 'facebook'));

      /**
       * Add a passport object to the session containing the user's userId.
       * @example passport { user: userId: '<UUID>' }
       */
      req.login(userId, (err) => {
        if (err) return next(err);

        // Marking the user as Callback Provider to view the success page.
        req.session.isCallbackProvider = true;

        res
          .status(info.status)
          .redirect(process.env.CLIENT_URL + info.redirect);
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
 * 2. If the authentication is successful, we call the login() method provided by PassportJS and redirect the
 * user to the success page.
 */
export const googleSignUpCallback = async (req, res, next) => {
  passport.authenticate(
    'google',
    { passReqToCallback: true },
    async (err, userId, info) => {
      if (err) return next(new SocialMediaAuthenticationError(err, 'google'));

      /**
       * Add a passport object to the session containing the user's userId.
       * @example passport { user: userId: '<UUID>' }
       */
      req.login(userId, (err) => {
        if (err) return next(err);

        // Marking the user as Callback Provider to view the success page.
        req.session.isCallbackProvider = true;

        res
          .status(info.status)
          .redirect(process.env.CLIENT_URL + info.redirect);
      });
    }
  )(req, res, next);
};

export default {
  register,
  verifyEmailRequest,
  verifyEmail,
  forgotPasswordRequest,
  resetPassword,
  signIn,
  signOut,
  facebookSignUp,
  facebookSignUpCallback,
  googleSignUp,
  googleSignUpCallback,
  getAuthInfo
};
