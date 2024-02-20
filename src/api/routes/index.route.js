import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';
import userRouter from './users.route.js';
import conversationRouter from './conversations.route.js';
import contactRouter from './contacts.route.js';

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/conversations', conversationRouter);
router.use('/contacts', contactRouter);

export default router;
