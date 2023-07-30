import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth.controller.js';

// Register route
router.post('/register', authController.register);

// Email verification route
router.get('/verify-email/:token', authController.emailVerification);

// Check users session when visting login page
router.get('/signInCheck', authController.signInCheck);

// Sign in using local strategy
router.post('/signin', authController.signIn);

// sign up using facebook strategy
router.get('/facebook', authController.facebookSignUp);
router.get('/facebook/callback', authController.facebookSignUpCallback);
export default router;
