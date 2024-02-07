import { Router } from 'express';
const router = new Router();

import mainController from '../controllers/main.controller.js';

router.get('/', mainController.getContacts);

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /contacts/search
 */
router.get('/search', mainController.search);

/**
 * Add/Remove a contact.
 * Endpoint: POST /contacts/manage
 */
router.post('/manage', mainController.handleContactAction);

export default router;
