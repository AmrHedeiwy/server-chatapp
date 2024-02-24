import { Router } from 'express';
const router = new Router();

import authController from '../controllers/auth.controller.js';

/**
 * Registers a new user.
 * Endpoint: POST /auth/register
 */
router.post('/register', authController.register);

/**
 * Registers a fake user account.
 * Endpoint: POST /auth/createFakeAccount
 */
router.post('/createFakeAccount', authController.fakeAccount);

/**
 * Sends a request to initiate email verification for a user.
 * Endpoint: POST /auth/email/verify/request
 */
router.post('/email/verify/request', authController.verifyEmailRequest);

/**
 * Verifies the user's email using the verification code.
 * Endpoint: PATCH /auth/email/verify
 */
router.patch('/email/verify', authController.verifyEmail);

/**
 * Sends a request to initiate the password reset process.
 * Endpoint: POST /auth/password/forgot
 */
router.post('/password/forgot', authController.forgotPasswordRequest);

/**
 * Resets the user's password using the reset token and new password.
 * Endpoint: PATCH /auth/password/reset
 */
router.patch('/password/reset', authController.resetPassword);

/**
 * Authenticates a user by signing them in.
 * Endpoint: POST /auth/sign-in
 */
router.post('/sign-in', authController.signIn);

/**
 * Retrieves the user's session.
 * Endpoint: GET /auth/session
 */
router.get('/session', authController.getSession);

/**
 * Signs out a user.
 * Endpoint: GET /auth/sign-out
 */
router.get('/sign-out', authController.signOut);

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
