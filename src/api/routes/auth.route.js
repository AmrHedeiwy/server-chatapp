import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth.controller.js';

router.post('/register', authController.register);
router.get('/verify-email/:token', authController.emailVerification);

router.post('/login', authController.login);

export default router;
