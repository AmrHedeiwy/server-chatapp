import { isAuthExpress } from '../middlewares/auth.middleware.js';
import {
  editProfileSchema,
  changePasswordSchema
} from '../validations/profile.validation.js';
import { userIdRateLimiter } from '../middlewares/rate-limit.middleware.js';
import validation from '../middlewares/validation.middleware.js';

import profileService from '../services/profile/profile.service.js';
import upload from '../middlewares/multer.middleware.js';
import db from '../models/index.js';

/**
 * Route handler for displaying the user's profile.
 *
 * This route expects a GET request.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Retrieves the user's profile information from the database,
 * including their seen message IDs and conversation IDs.
 * 3. Finally, the response is sent with user's profile information..
 */
export const view = [
  isAuthExpress,
  async (req, res, next) => {
    const curentUser = await db.User.findOne({
      where: { UserID: req.user.UserID },
      include: ['SeenMessageIDs', 'ConversationIDs']
    });

    res.json({ curentUser });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a PATCH request with the following OPTIONAL parameters in the request body:
 * - Firstname
 * - Lastname
 * - Username
 * - Email
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies UserID rate limiting using the userIdRateLimiter middleware to prevent abuse.
 * 3. Handles file upload using the upload.single middleware.
 * 4. Validates the request body at the validation middleware using the Joi editProfileSchema.
 * 5. If an image file is uploaded, attaches the image file path to the request body.
 * 6. Calls the saveNewCredentials function from the profileService to save the updated credentials.
 * 7. If an error occurs during the saving operation, passes the error to the error handling middleware.
 * 8. If the user's email is updated, logs out the user using the logout() method provided by PassportJS and redirect the
 * user to the email verification page with an appropriate message.
 * 9. Else, the response is sent with the appropriate status code, message and updated user.
 */
export const edit = [
  isAuthExpress,
  userIdRateLimiter,
  upload.single('Image'),
  validation(editProfileSchema),
  async (req, res, next) => {
    if (req.file?.path) req.body.FilePath = req.file.path;

    const { status, message, redirect, user, error } =
      await profileService.saveNewCredentials(req.body, req.user);

    if (error) return next(error);

    if (req.body.Email) {
      req.logout((options, done) => {
        res.status(status).json({ message, redirect });
      });
      return;
    }

    res.status(status).json({ user, message });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a POST request with the following OPTIONAL parameters in the request body:
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

    res.status(status).json({ message });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a POST request with the following OPTIONAL parameters in the request body:
 * - Email: The email promted by the user to confirm account deletion
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Deletes the user from the database using the deleteAccount function.
 * 3. If an error occurs during the process, the error is passed to the error handling middleware.
 * 4. If the account deletion was successfull, a success flash message is stored in the req.flash object.
 * 5. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const deleteAccount = [
  isAuthExpress,
  async (req, res, next) => {
    const { status, message, redirect, error } =
      await profileService.deleteAccount(req.body.Email, req.user);

    if (error) return next(error);

    req.flash('success', message);
    res.status(status).redirect(redirect);
  }
];

export default { view, edit, changePassword, deleteAccount };
