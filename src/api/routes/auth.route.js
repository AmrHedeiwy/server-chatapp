import { Router } from 'express';
const router = new Router();

import authController from '../controllers/auth.controller.js';

/**
 * Registers a new user.
 * Endpoint: POST /auth/register
 */
router.post('/register', authController.register);

/**
 * Sends a request to initiate email verification for a user.
 * Endpoint: POST /auth/request-email-verification
 */
router.post('/verify-email-request', authController.verifyEmailRequest);

/**
 * Verifies the user's email using the verification code.
 * Endpoint: POST /auth/verify-email
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * Sends a request to initiate the password reset process.
 * Endpoint: POST /auth/forgot-password
 */
router.post('/forgot-password', authController.forgotPasswordRequest);

/**
 * Resets the user's password using the reset token and new password.
 * Endpoint: POST /auth/reset-password
 */
router.post('/reset-password', authController.resetPassword);

/**
 *
 * Retrieves user session information for a specific page.
 * Endpoint: GET /auth/info/:Page
 */
router.get('/info/:type', authController.getAuthInfo);

/**
 * Authenticates a user by signing them in.
 * Endpoint: POST /auth/sign-in
 */
router.post('/sign-in', authController.signIn);

/**
 * Signs out a user.
 * Endpoint: POST /auth/sign-out
 */
router.post('/sign-out', authController.signOut);

/**
 * Initiates the Facebook sign-up process.
 * Endpoint: GET /auth/facebook
 */
router.get('/facebook', authController.facebookSignUp);

/**
 * Handles the callback after Facebook sign-up.
 * Endpoint: GET /auth/facebook/callback
 */
router.get('/facebook/callback', authController.facebookSignUpCallback);

/**
 * Initiates the Google sign-up process.
 * Endpoint: GET /auth/google
 */
router.get('/google', authController.googleSignUp);

/**
 * Handles the callback after Google sign-up.
 * Endpoint: GET /auth/google/callback
 */
router.get('/google/callback', authController.googleSignUpCallback);

export default router;
