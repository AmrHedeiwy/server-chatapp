import jwt from 'jsonwebtoken';
import { ResetPasswordError } from '../helpers/ErrorTypes.helper.js';

/**
 * Decodes and verifies a token from the request body.
 */
export const resetPasswordDecoder = async (req, res, next) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    delete req.body.token;

    // Set the unique identifier from the decoded token to userId in the request body
    req.body.userId = decoded.userId;

    next();
  } catch (err) {
    next(new ResetPasswordError());
  }
};
