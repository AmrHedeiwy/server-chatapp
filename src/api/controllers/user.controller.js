import { isAuthExpress } from '../middlewares/auth.middleware.js';
import { userIdRateLimiter } from '../middlewares/rate-limit.middleware.js';
import validation from '../middlewares/validation.middleware.js';
import upload from '../middlewares/multer.middleware.js';

import {
  editUserSchema,
  changePasswordSchema,
  friendSchema
} from '../validations/user.validation.js';
import {
  accountService,
  conversationService
} from '../services/user/index.service.js';
import { usersService } from '../services/search/index.service.js';

/**
 * Route handler for fetching the current user's data.
 *
 * This route expects a GET request.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Remove the password before sending to the client.
 * 3. Finally, the response is sent with user's information.
 */
export const current = [
  isAuthExpress,
  async (req, res, next) => {
    delete req.user?.Password;
    res.status(200).json({ curentUser: req.user ?? null });
  }
];

/**
 * Route handler for searching users based on a query.
 *
 * This route expects a GET request with the following parameters in the request query:.
 * - search: The query used to search for in the database.
 * - page: The rows to skip.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Fetches the users (batches of 10) from the database using the fetchUsers function.
 * 3. If an error occurs during the fetching process, passes the error to the error handling middleware.
 * 4. Finally, the response is sent with the fetched users and next page.
 */
export const search = [
  isAuthExpress,
  async (req, res, next) => {
    const { UserID, Username } = req.user;
    let { search, page } = req.query;

    page = parseInt(page);

    const { count, users, error } = await usersService.fetchUsers(
      UserID,
      Username,
      search,
      page
    );

    if (error) return next(error);
    /*
     * If the count - (page + BATCH) is less than or equal to 0 -> there are no more users
     * Else set the next page to page + 10 to skip n number of pages for the next fetch
     */
    let nextPage = null;
    if (count - (page + 10) > 0) nextPage = page + 10;

    res.json({ users: users.length != 0 ? users : null, nextPage });
  }
];

/**
 * Route handler for searching users based on a query.
 *
 * This route expects a POST request with the following parameters in the request body and params.
 * - FriendID: The UserID of the frined to add/remove. (body)
 * - action: Weather to add or remove a friend. (params)
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Adds/Removes the selected friend using the manageFriendship function.
 * 3. If an error occurs during the operation, passes the error to the error handling middleware.
 * 4. Finally, the response is sent with the follow status.
 */
export const handleFriendAction = [
  isAuthExpress,
  validation(friendSchema),
  async (req, res, next) => {
    const { action } = req.params;
    const { FriendID } = req.body;

    const { isFollowed, error } = await accountService.manageFriendship(
      action,
      req.user.UserID,
      FriendID
    );

    if (error) return next(error);

    res.json({ isFollowed });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a PATCH request with the following OPTIONAL parameters in the request body:
 * - Username
 * - Email
 * - Image
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies UserID rate limiting using the userIdRateLimiter middleware to prevent abuse.
 * 3. Handles file upload using the upload.single middleware.
 * 4. Validates the request body at the validation middleware using the Joi editProfileSchema.
 * 5. If an image file is uploaded, attaches the image file path to the request body.
 * 6. Saves the updated credentials to the database using the saevNewCredentials function.
 * 7. If an error occurs during the saving process, passes the error to the error handling middleware.
 * 8. If the user's email is updated, logs out the user using the logout() method provided by PassportJS and redirect the
 * user to the email verification page with an appropriate message.
 * 9. Else, the response is sent with the appropriate status code, message and updated user.
 */
export const edit = [
  isAuthExpress,
  userIdRateLimiter,
  upload.single('Image'),
  validation(editUserSchema),
  async (req, res, next) => {
    if (req.file?.path) req.body.FilePath = req.file.path;

    const { status, message, redirect, user, error } =
      await accountService.saveNewCredentials(req.body, req.user);

    if (error) return next(error);

    if (req.body.Email) {
      await req.logout((options, done) => {
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

    const { status, message, error } = await accountService.setChangePassword(
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
 * This route expects a POST request with the following parameters in the request body:
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
      await accountService.deleteAccount(req.body.Email, req.user);

    if (error) return next(error);

    req.flash('success', message);
    res.status(status).redirect(redirect);
  }
];

/**
 * Route handler for creating a conversation.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - OtherUserID: The ID of the user to start the conversation with
 * - IsGroup: A boolean indicating whether the conversation is a group conversation
 * - Members: An array of user IDs representing the members of the conversation (for group conversations)
 * - Name: The name of the conversation (for group conversations)
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Creates a new conversation using the addConversation function.
 * 3. If an error occurs during the process, the error is passed to the error handling middleware.
 * 4. If the conversation creation was successful, the created conversation object is sent in the response.
 */
export const createConversation = [
  isAuthExpress,
  async (req, res, next) => {
    const { OtherUserID, IsGroup, Members, Name } = req.body;

    const { conversation, error } = await conversationService.addConversation(
      req.user.UserID,
      OtherUserID,
      IsGroup,
      Members,
      Name
    );

    if (error) return next(error);

    res.json({ conversation });
  }
];

/**
 * Route handler for fetching conversations.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Fetches the conversations associated with the user using the fetchConversations function.
 * 3. If an error occurs during the process, the error is passed to the error handling middleware.
 * 4. If the conversations fetching was successful, the fetched conversations are sent in the response.
 */
export const getConversations = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversations, error } =
      await conversationService.fetchConversations(req.user.UserID);

    if (error) return next(error);

    res.json({ conversations });
  }
];

export default {
  current,
  search,
  handleFriendAction,
  getConversations,
  createConversation,
  edit,
  changePassword,
  deleteAccount
};
