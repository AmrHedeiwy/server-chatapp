import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';

router.get('/', (req, res, next) => {
  if (req.session && req.user) {
    return res.redirect('/chat.html');
  }

  res.redirect('/sign-in.html');
});

router.use('/auth', authRouter);

export default router;
