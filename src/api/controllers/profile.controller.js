import { isAuthExpress } from '../middlewares/auth.middleware.js';

export const view = [
  isAuthExpress,
  async (req, res, next) => res.status(200).json(req.user)
];

export default { view };
