import { Router } from 'express';
const router = new Router();

import mainController from '../controllers/main.controller.js';

/**
 * Get contacts of the current user.
 * Endpoint: GET /contacts
 */
router.get('/', mainController.getContacts);

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /contacts/search
 */
router.get('/search', mainController.search);

/**
 * Add a contact.
 * Endpoint: POST /contacts/:contactId
 */
router.post('/:contactId', mainController.addContact);

/**
 * Remove a contact.
 * Endpoint: DELETE /contacts/:contactId
 */
router.delete('/:contactId', mainController.deleteContact);

export default router;
