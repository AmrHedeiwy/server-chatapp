import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';

router.use('/auth', authRouter);

export default router;
