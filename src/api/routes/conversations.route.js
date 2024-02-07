import { Router } from 'express';
const router = new Router();

import mainController from '../controllers/main.controller.js';

/**
 * Create a new conversation.
 * Endpoint: POST /conversations/create
 */
router.post('/create', mainController.createConversation);

/**
 * Fetch current user's conversations.
 * Endpoint: GET /conversations/fetchAll
 */
router.get('/', mainController.getConversations);

/**
 * Fetches the next batch of messages in a conversation for pagination.
 * Endpoint: GET /conversations/messages
 */
router.get('/messages', mainController.getMessages);

export default router;
