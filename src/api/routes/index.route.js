import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';
import profileRouter from './users.route.js';

router.use('/auth', authRouter);
router.use('/profile', profileRouter);

export default router;
