import jwt from 'jsonwebtoken';
import { ResetPasswordError } from '../helpers/ErrorTypes.helper.js';

/**
 * Decodes and verifies a reset password token from the request body.
 */
export const resetPasswordDecoder = async (req, res, next) => {
  // Extract the Token from the request body.
  const { Token } = req.body;

  try {
    // Verify and decode the reset password token using the secret.
    const decoded = jwt.verify(Token, process.env.JWT_SECRET);

    // Remove the Token property from the request body.
    delete req.body.Token;

    // Set the UserID property in the request body with the decoded UserID.
    req.body.UserID = decoded.UserID;

    // Call the next middleware function.
    next();
  } catch (err) {
    // If an error occurs during token verification, invoke the ResetPasswordError middleware.
    next(new ResetPasswordError());
  }
};
