import jwt from 'jsonwebtoken';
import { ResetPasswordError } from '../helpers/ErrorTypes.helper.js';

/**
 * Decodes and verifies a reset password token from the request body.
 */
export const resetPasswordDecoder = async (req, res, next) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    delete req.body.token;

    // To be used to update the user's password from the database using their userId
    req.body.userId = decoded.userId;

    next();
  } catch (err) {
    next(new ResetPasswordError());
  }
};
