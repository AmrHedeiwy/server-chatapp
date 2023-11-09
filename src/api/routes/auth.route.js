import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth.controller.js';

/**
 * Registers a new user.
 * Endpoint: POST /auth/register
 * Controller: authController.register
 */
router.post('/register', authController.register);

/**
 * Sends a request to initiate email verification for a user.
 * Endpoint: POST /auth/request-email-verification
 * Controller: authController.emailVerificationRequest
 */
router.post('/verify-email-request', authController.verifyEmailRequest);

/**
 * Verifies the user's email using the verification code.
 * Endpoint: POST /auth/verify-email
 * Controller: authController.emailVerification
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * Sends a request to initiate the password reset process.
 * Endpoint: POST /auth/forgot-password
 * Controller: authController.forgotPasswordRequest
 */
router.post('/forgot-password', authController.forgotPasswordRequest);

/**
 * Resets the user's password using the reset token and new password.
 * Endpoint: POST /auth/reset-password
 * Controller: authController.resetPassword
 */
router.post('/reset-password', authController.resetPassword);

/**
 *
 * Retrieves user session information for a specific page.
 * Endpoint: GET /auth/info/:Page
 * Controller: authController.getAuthInfo
 */
router.get('/info/:type', authController.getAuthInfo);

/**
 * Authenticates a user by signing them in.
 * Endpoint: POST /auth/sign-in
 * Controller: authController.signIn
 */
router.post('/sign-in', authController.signIn);

/**
 * Signs out a user.
 * Endpoint: POST /auth/sign-out
 * Controller: authController.signOut
 */
router.post('/sign-out', authController.signOut);

/**
 * Initiates the Facebook sign-up process.
 * Endpoint: GET /auth/facebook
 * Controller: authController.facebookSignUp
 */
router.get('/facebook', authController.facebookSignUp);

/**
 * Handles the callback after Facebook sign-up.
 * Endpoint: GET /auth/facebook/callback
 * Controller: authController.facebookSignUpCallback
 */
router.get('/facebook/callback', authController.facebookSignUpCallback);

/**
 * Initiates the Google sign-up process.
 * Endpoint: GET /auth/google
 * Controller: authController.googleSignUp
 */
router.get('/google', authController.googleSignUp);

/**
 * Handles the callback after Google sign-up.
 * Endpoint: GET /auth/google/callback
 * Controller: authController.googleSignUpCallback
 */
router.get('/google/callback', authController.googleSignUpCallback);

export default router;
