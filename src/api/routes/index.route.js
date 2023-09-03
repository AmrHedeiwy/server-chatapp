import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';
import profileRouter from './profile.route.js';

router.get('/', (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/chat.html');
  }

  res.redirect('/sign-in.html');
});

router.use('/auth', authRouter);
router.use('/profile', profileRouter);

export default router;
