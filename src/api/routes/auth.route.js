import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth.controller.js';

// Register route.
router.post('/register', authController.register);

// Email verification route.
router.post('/verify-email', authController.emailVerification);

// Check users session when visting login or email verification pages.
router.get('/signInCheck', authController.signInCheck);
router.get('/emailVerificationCheck', authController.emailVerificationCheck);

// Sign in using local strategy.
router.post('/signin', authController.signIn);

// sign up using facebook strategy.
router.get('/facebook', authController.facebookSignUp);
router.get('/facebook/callback', authController.facebookSignUpCallback);

// sign up using google strategy.
router.get('/google', authController.googleSignUp);
router.get('/google/callback', authController.googleSignUpCallback);

export default router;
