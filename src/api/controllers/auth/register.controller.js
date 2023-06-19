import { createUser } from '../../services/user.service.js';
import validation from '../../middlewares/validation.middleware.js';
import userSchema from '../../validations/user.validation.js';

/**
 * Registers a new user in the system.
 *
 * @function register
 * @access Public
 *
 * @middleware validation(userSchema) - Validates user input.
 * @param {Object} req - The HTTP request object.
 * @param {string} req.body - The request body containing user data.
 *
 * @param {string} req.body.Firstname - The user's first name.
 * @param {string} req.body.Lastname - The user's last name.
 * @param {string} req.body.Username - The user's username.
 * @param {string} req.body.Email - The user's email address.
 * @param {string} req.body.Password - The user's password.
 *
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware in the chain.
 * @returns {Object} An object containing information about the result
 * of the operation.
 *
 * The object contains the following properties:
 * - status (The status depending on the result of the opperation).
 * - message (A user-friendly message to be sent to the client).
 * - error (The error object, if any. Can contain information about the error,
 * such as validation errors, constraint errors, or server errors).
 */
const register = [
  validation(userSchema),
  async (req, res, next) => {
    const body = req.body;

    const { status, message, error } = await createUser(body);
    if (error) return next(error);

    res.status(status).json(message);
  }
];

export default {
  register
};
