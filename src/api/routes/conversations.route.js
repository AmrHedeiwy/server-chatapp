import { Router } from 'express';
const router = new Router();

import mainController from '../controllers/main.controller.js';

/**
 * Create a new conversation.
 * Endpoint: POST /conversations/create
 */
router.post('/create', mainController.createConversation);

/**
 * Upload an image for a group conversation.
 * Endpoint: POST /conversations/group/image
 */
router.post('/group/image', mainController.uploadImage);

/**
 * Update group name.
 * Endpoint: PATCH /conversations/group/name
 */
router.patch('/group/name', mainController.updateName);

/**
 * Add members to a group conversation.
 * Endpoint: POST /conversations/group/members
 */
router.post('/group/members', mainController.addMembers);

/**
 * Delete a member from a group conversation.
 * Endpoint: DELETE /conversations/group/:conversationId/members/:memberId
 */
router.delete(
  '/group/:conversationId/members/:memberId',
  mainController.deleteMember
);

/**
 * Update admin status of a member in a group conversation.
 * Endpoint: PATCH /conversations/group/admin
 */
router.patch('/group/admin', mainController.updateAdminStatus);

/**
 * Delete a group conversation.
 * Endpoint: DELETE /conversations/group/:conversationId
 */
router.delete('/group/:conversationId', mainController.deleteConversation);

/**
 * Remove a single conversation.
 * Endpoint: PUT /conversations/single/:conversationId
 */
router.put('/single/:conversationId', mainController.removeConversation);

/**
 * Fetches the next batch of messages in a conversation for pagination.
 * Endpoint: GET /conversations/messages
 */
router.get('/messages', mainController.getMessages);

/**
 * Fetch current user's conversations.
 * Endpoint: GET /conversations
 */
router.get('/', mainController.getConversations);

/**
 * Get a conversation by its ID.
 * Endpoint: GET /conversations/:conversationId
 */
router.get('/:conversationId', mainController.getConversation);

export default router;
