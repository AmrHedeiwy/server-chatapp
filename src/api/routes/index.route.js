import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';
import profileRouter from './user.route.js';

router.use('/auth', authRouter);
router.use('/user', profileRouter);

export default router;
