import { Router } from 'express';
const router = new Router();

import userController from '../controllers/user.controller.js';

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /user/view
 * Controller: userController.view
 */
router.get('/current', userController.current);

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /user/view
 * Controller: userController.view
 */
router.get('/search', userController.search);

/**
 * Add/Remove a friend.
 * Endpoint: POST /user/friend/:action
 * Controller: userController.handleFriendAction
 */
router.post('/friend/:action', userController.handleFriendAction);

/**
 * Create a new conversation.
 * Endpoint: POST /user/conversation/
 * Controller: userController.createConversation
 */
router.post('/conversation', userController.createConversation);

router.get('/conversation/:conversationId', userController.getConversation);

/**
 * Fetch current user's conversations.
 * Endpoint: GET /user/conversations
 * Controller: userController.getConversations
 */
router.get('/conversations', userController.getConversations);

/**
 * Edits the user's profile.
 * Endpoint: PATCH /user/edit
 * Controller: userController.edit
 */
router.post('/edit', userController.edit);

/**
 * Changes the user's password.
 * Endpoint: POST /user/change-password
 * Controller: userController.changePassword
 */
router.post('/change-password', userController.changePassword);

/**
 * Deletes the user's account.
 * Endpoint: POST /user/delete-account
 * Controller: userController.changePassword
 */
router.post('/delete-account', userController.deleteAccount);

export default router;
