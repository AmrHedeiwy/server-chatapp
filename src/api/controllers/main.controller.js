import { isAuthExpress } from '../middlewares/auth.middleware.js';
import { userIdRateLimiter } from '../middlewares/rate-limit.middleware.js';
import validation from '../middlewares/validation.middleware.js';
import upload from '../middlewares/multer.middleware.js';

import {
  editUserSchema,
  changePasswordSchema,
  contactSchema,
  createConversationSchema
} from '../validations/main.validation.js';

import {
  userService,
  conversationService,
  contactService,
  uploadService
} from '../services/main/index.js';

/******* user actions *******/

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
    const { userId, username, email, image, createdAt } = req.user;
    res
      .status(200)
      .json({ curentUser: { userId, username, email, image, createdAt } });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies rate limiting based on the userId to prevent abuse using the userIdRateLimiter middleware.
 * 3. Handles file upload for the 'image' field using the upload middleware.
 * 4. Validates the request body using the Joi editUserSchema at the validation middleware.
 * 5. Updates the user's credentials using the saveNewCredentials function.
 * 6. If an error occurs during the process, it is passed to the error handling middleware.
 * 7. If the operation is successful and a new email is provided, logs out the user and sends a response with the appropriate status code and redirect URL.
 * 8. If the operation is successful and no new email is provided, sends a response with the appropriate status code and updated user information.
 */
export const edit = [
  isAuthExpress,
  userIdRateLimiter,
  upload.single('image'),
  validation(editUserSchema),
  async (req, res, next) => {
    const { status, message, redirect, user, error } =
      await userService.saveNewCredentials(req.body, req.user);

    if (error) return next(error);

    if (req.body.email) {
      await req.logout((options, done) => {
        res.status(status).json({ message, redirect });
      });
      return;
    }

    res.status(status).json({ user, message });
  }
];

/**
 * Route handler for changing the user's password.
 *
 * This route expects a POST request with the following OPTIONAL parameters in the request body:
 * - currentPassword: The user's current password.
 * - newPassword: The new password to be set.
 * - confirmPassword: The re-entered password.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies rate limiting based on the UserID to prevent abuse using the userIdRateLimiter middleware.
 * 3. Validates the request body using the Joi changePasswordSchema at the validation middleware.
 * 4. Updates the user's password using the setChangePassword function.
 * 5. If an error occurs during the password change process, it is passed to the error handling middleware.
 * 6. If the password change is successful, the response is sent with the appropriate status code and message.
 */
export const changePassword = [
  isAuthExpress,
  userIdRateLimiter,
  validation(changePasswordSchema),
  async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const { status, message, error } = await userService.setChangePassword(
      currentPassword,
      newPassword,
      req.user.UserID
    );
    if (error) return next(error);

    res.status(status).json({ message });
  }
];

/**
 * Route handler for deleting the user's account.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - email: The email used to confirm the account deletion.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Deletes the user's account from the database using the deleteUser function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the account deletion is successful, a success flash message is stored in the req.flash object.
 * 5. Finally, the response is sent with the appropriate status code and redirect URL.
 */
export const deleteAccount = [
  isAuthExpress,
  async (req, res, next) => {
    const { status, message, redirect, error } = await userService.deleteUser(
      req.body.email,
      req.user
    );

    if (error) return next(error);

    req.flash('success', message);
    res.status(status).redirect(redirect);
  }
];

/******* conversation actions *******/

/**
 * Route handler for creating a conversation.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - otherUserId: The ID of the user to start the conversation with.
 * - isGroup: A boolean indicating whether the conversation is a group conversation.
 * - members: An array of user IDs representing the members of the conversation (for group conversations).
 * - name: The name of the conversation (for group conversations).
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Creates a new conversation using the addConversation function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the conversation creation is successful, the created conversation object is sent in the response.
 */
export const createConversation = [
  isAuthExpress,
  validation(createConversationSchema),
  async (req, res, next) => {
    const { otherUserId, isGroup, members, name } = req.body;
    const { sockets } = req.user;

    const { conversation, error } = await conversationService.addConversation(
      req.user.userId,
      !isGroup ? sockets.includes(otherUserId) : false, // checks if a conversation aready exists with the other user, excluding group chats
      name,
      members,
      isGroup
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
 * 2. Fetches conversations associated with the user using the fetchConversations function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the conversation fetching is successful, the fetched conversations are sent in the response.
 */
export const getConversations = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversations, groupedMessages, error } =
      await conversationService.fetchConversations(
        req.user.userId,
        req.user.conversations
      );

    if (error) return next(error);

    res.json({ conversations, groupedMessages });
  }
];

/**
 * Route handler for fetching the next batch of messages in a conversation for pagination.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Parses the request query to extract the conversationId and page parameters.
 * 3. Calls the getMessages function to fetch messages for the specified conversation and page.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the message fetching is successful, the fetched items (messages) and information about
 * the next page (if available) are sent in the response.
 */
export const getMessages = [
  isAuthExpress,
  async (req, res, next) => {
    let { conversationId, page } = req.query;

    page = parseInt(page);

    const { hasNextPage, items, error } = await conversationService.getMessages(
      conversationId,
      page
    );

    if (error) return next(error);

    res.json({ items, nextPage: hasNextPage ? page + 20 : null });
  }
];

/******* contact actions *******/

export const getContacts = [
  isAuthExpress,
  async (req, res, next) => {
    const { userId } = req.user;

    const { contacts, error } = await contactService.fetchContacts(userId);

    if (error) return next(error);

    res.json({ contacts });
  }
];

/**
 * Route handler for searching users based on a query.
 *
 * This route expects a GET request with the following parameters in the request query:
 * - search: The query used to search for users in the database.
 * - page: The page number indicating the batch of users to retrieve.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Fetches users (in batches of 10) from the database using the fetchUsers function.
 * 3. If an error occurs during the fetching process, it is passed to the error handling middleware.
 * 4. Finally, the response is sent with the fetched users and the next page number if available.
 */
export const search = [
  isAuthExpress,
  async (req, res, next) => {
    const { userId, username } = req.user;
    let { search, page } = req.query;

    page = parseInt(page);

    const { hasNextPage, items, error } = await contactService.fetchUsers(
      userId,
      username,
      search,
      page
    );

    if (error) return next(error);

    /*
     * If the count - (page + BATCH) is less than or equal to 0, there are no more users.
     * Otherwise, set the next page to page + 10 to skip to the next batch of users.
     */

    res.json({
      items: items.length !== 0 ? items : null,
      nextPage: hasNextPage ? page + 10 : null
    });
  }
];

/**
 * Route handler for adding/removing contacts.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - contactId: The UserID of the contact to add/remove.
 * - action: Specifies whether to add or remove a friend.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Validates the request body against the contactSchema.
 * 3. Adds/Removes the selected contact using the manageContact function.
 * 4. If an error occurs during the operation, it is passed to the error handling middleware.
 * 5. Responds with the status of the contact addition/removal.
 */
export const handleContactAction = [
  isAuthExpress,
  validation(contactSchema),
  async (req, res, next) => {
    const { contactId, action } = req.body;

    const { isContact, error } = await contactService.manageContact(
      action,
      req.user.userId,
      contactId
    );

    if (error) return next(error);

    res.json({ isContact });
  }
];

export const uploadFile = [
  isAuthExpress,
  upload.single('file'),
  async (req, res, next) => {
    const queryParams = req.query;

    const entries = Object.entries(queryParams)[0];

    const { fileUrl, error } = await uploadService.upload(
      req.body.path,
      entries[0],
      entries[1]
    );

    if (error) return next(error);

    res.json({ fileUrl });
  }
];

export default {
  current,
  edit,
  changePassword,
  deleteAccount,
  createConversation,
  getConversations,
  getMessages,
  getContacts,
  search,
  handleContactAction,
  uploadFile
};
