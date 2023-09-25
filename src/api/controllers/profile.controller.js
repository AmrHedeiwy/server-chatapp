import { isAuthExpress } from '../middlewares/auth.middleware.js';
import {
  editProfileSchema,
  changePasswordSchema
} from '../validations/profile.validation.js';
import { userIdRateLimiter } from '../middlewares/rate-limit.middleware.js';
import validation from '../middlewares/validation.middleware.js';

import profileService from '../services/profile/edit.service.js';
import upload from '../middlewares/multer.middleware.js';

/**
 * Route handler for displaying the user's profile.
 *
 * This route expects a GET request.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Returns the user's credentials from the 'req.user' object.
 */
export const view = [
  isAuthExpress,
  async (req, res, next) => res.status(200).json({ user: req.user })
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a PATCH request with the following OPTIONAL parameters in the request body:
 * - Firstname: The first name of the user.
 * - Lastname: The last name of the user.
 * - Username: The username of the user.
 * - Email: The email address of the user.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies UserID rate limiting using the userIdRateLimiter middleware to prevent abuse.
 * 3. Handles file upload using the upload.single middleware.
 * 4. Validates the request body at the validation middleware using the Joi editProfileSchema.
 * 5. If an image file is uploaded, attaches the image buffer to the request body.
 * 6. Calls the saveNewCredentials function from the profileService to save the updated credentials and profile.
 * 7. If an error occurs during the save operation, passes the error to the error handling middleware.
 * 8. If the user's email is updated, logs out the user, sets the needsVerification session variable,
 * flashes a success message, and redirects the user to the email verification page.
 * 9. If the user's email is not updated, the response is sent with the appropriate status code and message.
 */
export const edit = [
  isAuthExpress,
  userIdRateLimiter,
  upload.single('Image'),
  validation(editProfileSchema),
  async (req, res, next) => {
    if (req.file?.buffer) req.body.Buffer = req.file.buffer;

    const { status, message, redirect, user, error } =
      await profileService.saveNewCredentials(req.body, req.user);

    if (error) return next(error);

    if (req.body.Email) {
      const firstname = req.body?.Firstname ?? req.user.Firstname;
      req.logout((options, done) => {
        req.session.needsVerification = {
          Email: req.body.Email,
          Firstname: firstname
        };
        req.flash('success', message);
        res.status(status).redirect(redirect);
      });
      return;
    }
    res.status(status).json({ user, message });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a PATCH request with the following OPTIONAL parameters in the request body:
 * - CurrentPassword: The user's current password.
 * - NewPassword: The new password to be set.
 * - ConfirmPassword: The re-entered password.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies UserID rate limiting using the userIdRateLimiter middleware to prevent abuse.
 * 3. Validates the request body at the validation middleware using the Joi changePasswordSchema.
 * 4. Updates the user's password using the setChangePassword function.
 * 5. If an error occurs during the password change process, the error is passed to the error handling middleware.
 * 6. If the password change is successful, the response is sent with the appropriate status code and message.

 */
export const changePassword = [
  isAuthExpress,
  userIdRateLimiter,
  validation(changePasswordSchema),
  async (req, res, next) => {
    const { CurrentPassword, NewPassword } = req.body;

    const { status, message, error } = await profileService.setChangePassword(
      CurrentPassword,
      NewPassword,
      req.user.UserID
    );
    if (error) return next(error);

    res.status(status).json(message);
  }
];

export default { view, edit, changePassword };
