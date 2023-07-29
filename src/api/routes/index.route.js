import { Router } from 'express';
const router = new Router();

import authRouter from './auth.route.js';

router.get('/', (req, res, next) => {
  console.log(req.session, req.user);
  if (req.session && req.user) {
    return res.redirect('/chat.html');
  }
  res.redirect('/signIn.html');
});

router.use('/auth', authRouter);

export default router;
