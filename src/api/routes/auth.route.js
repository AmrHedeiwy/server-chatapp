import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth.controller.js';

// Register route
router.post('/register', authController.register);

// Email verification route
router.get('/verify-email/:token', authController.emailVerification);

// Sign in route
router.post('/signin', authController.signIn);
router.get('/signInCheck', authController.signInCheck);

export default router;
