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
 */
const register = [
  // Middleware function that validates the request body against the Joi schema.
  validation(userSchema),
  // Route handler that creates a new user using the the request body.
  async (req, res, next) => {
    const body = req.body;

    const { status, message, errors } = await createUser(body);

    // If there are any errors returned from createUser, pass them to the next middleware function.
    if (errors) return next(errors);

    // Otherwise, set the response status to the status returned by createUser and send the message to the client as JSON.
    res.status(status).json(message);
  }
];

export default {
  register
};
