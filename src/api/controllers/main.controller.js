import { isAuthExpress } from '../middlewares/auth.middleware.js';
import { userIdRateLimiter } from '../middlewares/rate-limit.middleware.js';
import validation from '../middlewares/validation.middleware.js';
import upload from '../middlewares/multer.middleware.js';

import {
  editUserSchema,
  changePasswordSchema,
  createConversationSchema,
  updateNameSchema,
  addMembersSchema
} from '../validations/main.validation.js';

import {
  userService,
  conversationService,
  contactService
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
const current = [
  isAuthExpress,
  async (req, res, next) => {
    const { userId, googleId, facebookId, username, email, image, createdAt } =
      req.user;
    res.status(200).json({
      curentUser: {
        userId,
        googleId,
        facebookId,
        username,
        email,
        image,
        createdAt
      }
    });
  }
];

/**
 * Route handler for editing the user's profile.
 *
 * This route expects a PUT request with the following OPTIONAL parameters in the request body:
 * - username: The new username of the user to update.
 * - email: The user's new email to update (Needs to verify their new email).
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Handles file upload for the 'image' field using the upload middleware.
 * 3. Validates the request body using the Joi editUserSchema at the validation middleware.
 * 4. Updates the user's credentials using the saveNewCredentials function.
 * 5. If an error occurs during the process, it is passed to the error handling middleware.
 * 6. If the operation is successful and a new email is provided, logs out the user and sends a response with the appropriate status code and redirect URL.
 * 7. If the operation is successful and no new email is provided, sends a response with the appropriate status code and updated user information.
 */
const edit = [
  isAuthExpress,
  validation(editUserSchema),
  async (req, res, next) => {
    const { status, message, redirect, error } =
      await userService.saveNewCredentials(
        req.user.conversationIds,
        req.user.userId,
        req.user.username,
        req.body
      );

    if (error) return next(error);

    res.status(status).json({ message, redirect });
  }
];

/**
 * Route handler for changing a user's avatar.
 *
 * This route expects a POST request with the following parameters in the request file:
 * - path: The location of the image file saved in the tmp folder by the multer middleware.
 *
 * This route performs the following steps:
 * 1. Generates fake user account data using the generateFakeAccount function from the registerService.
 * 2. Attempts to log in the newly created user using their user ID.
 * 3. If the login is successful, the response is sent with the appropriate status code, message, and redirect URL.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 */
const changeAvatar = [
  isAuthExpress,
  upload.single('file'),
  async (req, res, next) => {
    const { path } = req.file ?? {};

    const { image, status, error } = await userService.uploadAvatar(
      req.user.userId,
      req.user.conversationIds,
      path
    );

    if (error) return next(error);

    res.status(status).json({ image });
  }
];

/**
 * Route handler for changing the user's password.
 *
 * This route expects a POST request with the following OPTIONAL parameters in the request body:
 * - currentPassword: The user's current password.
 * - newPassword: The new password to be set.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Applies rate limiting based on the UserID to prevent abuse using the userIdRateLimiter middleware.
 * 3. Validates the request body against the changePasswordSchema.
 * 4. Updates the user's password using the setChangePassword function.
 * 5. If an error occurs during the password change process, it is passed to the error handling middleware.
 * 6. If the password change is successful, the user is logged out and the response is sent with the appropriate status code and message.
 */
const changePassword = [
  isAuthExpress,
  userIdRateLimiter,
  validation(changePasswordSchema),
  async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const { status, message, redirect, error } =
      await userService.setChangePassword(
        req.user.userId,
        currentPassword,
        newPassword
      );
    if (error) return next(error);

    await req.logOut((err) => {
      if (err) return next(err);

      res.status(status).json({ message, redirect });
    });
  }
];

/**
 * Route handler for deleting the user's account.
 *
 * This route expects a DELETE request.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Deletes the user's account from the database using the deleteUser function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the account deletion is successful, the user is logged out, and an empty response is sent.
 */
const deleteUser = [
  isAuthExpress,
  async (req, res, next) => {
    const { userId, conversationIds, singleConversationUserIds } = req.user;
    const { status, error } = await userService.deleteUser(
      userId,
      conversationIds, // Used to notify all conversations about the deleted user.
      singleConversationUserIds // Used to notify to all one-to-one conversations about the user's online status
    );

    if (error) return next(error);

    console.log('call');
    await req.logOut((err) => {
      if (err) return next(err);

      res.status(status).json();
    });
  }
];

/******* conversation actions *******/

/**
 * Route handler for creating a conversation.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - isGroup: A boolean indicating whether the conversation is a group conversation.
 * - memberIds: An array of userIds representing the members participating in the conversation (excluding the current user).
 * - name: The name of the group conversation (required when isGroup is set to true).
 * - isImage: Indicates whether there will be an image for a group conversation (required when isGroup is set to true).
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Validates the request body against the createConversationSchema.
 * 3. Creates a new conversation using the addConversation function.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the conversation creation is successful, the created conversation object is sent in the response.
 */
const createConversation = [
  isAuthExpress,
  validation(createConversationSchema),
  async (req, res, next) => {
    const { isGroup, memberIds, name, isImage } = req.body;
    const { singleConversationUserIds } = req.user;

    const { status, conversation, exists, error } =
      await conversationService.addConversation(
        req.user.userId,
        // If the conversation is a one-to-one conversation, checks if a conversation already exists with the other member.
        !isGroup ? singleConversationUserIds.includes(memberIds[0]) : false,
        memberIds,
        name,
        isGroup,
        isImage
      );

    if (error) return next(error);

    res.status(status).json({ conversation, exists });
  }
];

/**
 * Route handler for fetching conversations.
 *
 * This route expects a GET request.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Fetches conversations associated with the user using the fetchConversations function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the conversation fetching is successful, the fetched conversations are sent in the response.
 */
const getConversations = [
  isAuthExpress,
  async (req, res, next) => {
    const { status, conversations, groupedMessages, error } =
      await conversationService.fetchConversations(
        req.user.conversationIds,
        req.user.userId
      );

    if (error) return next(error);

    res.status(status).json({ conversations, groupedMessages });
  }
];

/**
 * Route handler for fetching a single conversation.
 *
 * This route expects a GET request with the following parameters in the request params:
 * - conversationId: The conversation ID to fetch from the database.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Fetches the conversation associated with the provided conversationId using the fetchConversation function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the conversation fetching is successful, the fetched conversation is sent in the response.
 */
const getConversation = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversationId } = req.params;

    const { status, conversation, error } =
      await conversationService.fetchConversation(
        conversationId,
        req.user.userId
      );

    if (error) return next(error);

    res.status(status).json({ conversation });
  }
];

/**
 * Route handler for fetching the next batch of messages in a conversation for pagination.
 *
 * This route expects a GET request with the following parameters in the request query:
 * - conversationId: The conversation to fetch the messages from.
 * - page: The number of rows to skip.
 * - joinedAt: To filter only the messages after the date the user joined the conversation.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Parses the request query to extract the conversationId, page, and joinedAt parameters.
 * 3. Calls the fetchMessages function to fetch messages for the specified conversation and page.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the message fetching is successful, the fetched items (messages) and information about
 *    the next page (if available) are sent in the response.
 */
const getMessages = [
  isAuthExpress,
  async (req, res, next) => {
    let { conversationId, page, joinedAt } = req.query;

    page = parseInt(page);

    const { status, hasNextPage, items, error } =
      await conversationService.fetchMessages(
        conversationId,
        req.user.userId,
        page,
        joinedAt
      );

    if (error) return next(error);

    res
      .status(status)
      .json({ items, nextPage: hasNextPage ? page + 20 : null });
  }
];

/**
 * Route handler for handling image uploads in a conversation.
 *
 * This route expects a POST request with the following parameters in the request body/file:
 * - file: The new image of the group conversation.
 * - conversationId: The ID of the group conversation to update with the new image.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Handles file uploads using the upload middleware.
 * 3. Calls the uploadImage function to upload the image for the specified conversation.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the image upload is successful, an appropriate response is sent with the corresponding status code.
 */
const uploadImage = [
  isAuthExpress,
  upload.single('file'),
  async (req, res, next) => {
    const { path } = req.file ?? {};

    const { status, error } = await conversationService.uploadGroupImage(
      req.body.conversationId,
      req.user.userId,
      path
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/**
 * Route handler for updating the name of a conversation.
 *
 * This route expects a PATCH request with the following parameters in the request body:
 * - conversationId: The ID of the conversation to update the name for.
 * - name: The new name of the conversation.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Validates the request body against the updateNameSchema.
 * 3. Calls the updateName function to update the name of the conversation.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the name update is successful, an appropriate response is sent with the corresponding status code.
 */
const updateName = [
  isAuthExpress,
  validation(updateNameSchema),
  async (req, res, next) => {
    const { conversationId, name } = req.body;

    const { status, error } = await conversationService.setNewName(
      conversationId,
      req.user.userId,
      name
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/**
 * Route handler for adding members to a conversation.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - conversationId: The ID of the conversation to add the new members to.
 * - memberIds: An array of userIds representing the members to add to the conversation.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Validates the request body against the addMembersSchema.
 * 3. Calls the addMembers function to add new members to the conversation.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the member addition is successful, an appropriate response is sent with the corresponding status code
 *    and information about the new members added.
 */
const addMembers = [
  isAuthExpress,
  validation(addMembersSchema),
  async (req, res, next) => {
    const { conversationId, memberIds } = req.body;

    const { status, newMembers, error } =
      await conversationService.setNewMembers(
        conversationId,
        req.user.userId,
        memberIds
      );

    if (error) return next(error);

    res.status(status).json({ newMembers });
  }
];

/**
 * Route handler for deleting a member from a conversation.
 *
 * This route expects a DELETE request with the following parameters in the request params:
 * - conversationId: The ID of the conversation to remove the member from.
 * - memberId: The ID of the member to remove.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Calls the deleteMember function to remove a member from the conversation.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the member deletion is successful, an appropriate response is sent with the corresponding status code.
 */
const deleteMember = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversationId, memberId } = req.params;

    const { status, error } = await conversationService.deleteMember(
      conversationId,
      req.user.userId,
      memberId
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/**
 * Route handler for updating the admin status of a member in a conversation.
 *
 * This route expects a PATCH request with the following parameters in the request body:
 * - conversationId: The ID of the conversation to update the admin status.
 * - setStatus: Whether to 'promote' or 'demote' the member.
 * - memberId: The userId of the member to update the admin status.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Validates the request body against the updateAdminStatusSchema.
 * 3. Calls the setAdminStatus function to update the admin status of the specified member in the conversation.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the admin status update is successful, an appropriate response is sent with the corresponding status code.
 */
const updateAdminStatus = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversationId, setStatus, memberId } = req.body;

    const { status, error } = await conversationService.setAdminStatus(
      conversationId,
      req.user.userId,
      setStatus,
      memberId
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/**
 * Route handler for deleting a conversation.
 *
 * This route expects a DELETE request with the following parameters in the request params:
 * - conversationId: The ID of the conversation to delete from the database.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Retrieves the conversationId from the request parameters.
 * 3. Calls the deleteConversation function to delete the conversation.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the conversation is successfully deleted, the response is sent with an appropriate status code
 *    and an empty JSON object.
 */
const deleteConversation = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversationId } = req.params;

    const { status, error } = await conversationService.deleteConversation(
      conversationId,
      req.user.userId
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/**
 * Route handler for removing a one-to-one conversation only from the requested user.
 * The user that made the request will not be able to view the conversation anymore.
 *
 * This route expects a PATCH request with the following parameters in the request params:
 * - conversationId: The ID of the conversation to remove from the database.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Retrieves the conversationId from the request parameters.
 * 3. Calls the removeConversation function to remove the conversation.
 * 4. If an error occurs during the process, it is passed to the error handling middleware.
 * 5. If the conversation is successfully removed, the response is sent with an appropriate status code
 *    and an empty JSON object.
 */
const removeConversation = [
  isAuthExpress,
  async (req, res, next) => {
    const { conversationId } = req.params;

    const { status, error } = await conversationService.removeConversation(
      conversationId,
      req.user.userId
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/******* contact actions *******/

/**
 * Route handler for fetching contacts.
 *
 * This route expects a GET request.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Fetches contacts associated with the user using the fetchContacts function.
 * 3. If an error occurs during the process, it is passed to the error handling middleware.
 * 4. If the contact fetching is successful, the fetched contacts are sent in the response.
 */
const getContacts = [
  isAuthExpress,
  async (req, res, next) => {
    const { status, contacts, error } = await contactService.fetchContacts(
      req.user.contactIds
    );

    if (error) return next(error);

    res.status(status).json({ contacts });
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
const search = [
  isAuthExpress,
  async (req, res, next) => {
    const { userId } = req.user;
    let { search, page } = req.query;

    page = parseInt(page);

    const { status, hasNextPage, items, error } =
      await contactService.fetchUsers(userId, search, page);

    if (error) return next(error);

    /*
     * If the count - (page + BATCH) is less than or equal to 0, there are no more users.
     * Otherwise, set the next page to page + 10 to skip to the next batch of users.
     */

    res.status(status).json({
      items: items.length !== 0 ? items : null,
      nextPage: hasNextPage ? page + 10 : null
    });
  }
];

/**
 * Route handler for adding a contact.
 *
 * This route expects a POST request with the following parameters in the request body:
 * - contactId: The userId of the contact to add.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Adds the specified contact using the setContact function.
 * 3. If an error occurs during the operation, it is passed to the error handling middleware.
 * 4. Responds with the status of the contact addition.
 */
const addContact = [
  isAuthExpress,
  async (req, res, next) => {
    const { contactId } = req.params;

    const { status, error } = await contactService.setContact(
      req.user.userId,
      contactId
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

/**
 * Route handler for deleting a contact.
 *
 * This route expects a DELETE request with the following parameters in the request params:
 * - contactId: The UserID of the contact to delete.
 *
 * This route performs the following steps:
 * 1. Authenticates the user using the isAuthExpress middleware.
 * 2. Retrieves the contactId from the request parameters.
 * 3. Deletes the specified contact using the deleteContact function.
 * 4. If an error occurs during the operation, it is passed to the error handling middleware.
 * 5. Responds with the status of the contact deletion.
 */
const deleteContact = [
  isAuthExpress,
  async (req, res, next) => {
    const { contactId } = req.params;

    const { status, error } = await contactService.deleteContact(
      req.user.userId,
      contactId
    );

    if (error) return next(error);

    res.status(status).json();
  }
];

export default {
  current,
  edit,
  changeAvatar,
  changePassword,
  deleteUser,
  createConversation,
  getConversations,
  getConversation,
  getMessages,
  uploadImage,
  updateName,
  addMembers,
  deleteMember,
  updateAdminStatus,
  deleteConversation,
  removeConversation,
  getContacts,
  search,
  addContact,
  deleteContact
};
