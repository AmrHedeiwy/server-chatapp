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
router.get('/fetchAll', mainController.getConversations);

export default router;
