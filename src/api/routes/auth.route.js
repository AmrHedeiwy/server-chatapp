import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth/auth.controller.js';

router.post('/register', authController.register);
router.get('/verify-email/:token', authController.emailVerification);

export default router;
