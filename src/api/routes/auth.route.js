import { Router } from 'express';
const router = new Router();
import authController from '../controllers/auth/register.controller.js';

router.post('/register', authController.register);

export default router;
