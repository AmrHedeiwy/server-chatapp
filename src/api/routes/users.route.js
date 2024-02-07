import { Router } from 'express';
const router = new Router();

import mainController from '../controllers/main.controller.js';

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /users/current
 */
router.get('/current', mainController.current);

/**
 * Edits the user's profile.
 * Endpoint: PUT /users/edit
 */
router.put('/edit', mainController.edit);

/**
 * Changes the user's password.
 * Endpoint: PATCH /users/change-password
 */
router.patch('/change-password', mainController.changePassword);

/**
 * Deletes the user's account.
 * Endpoint: DElETE /users/delete-account
 */
router.delete('/delete-account', mainController.deleteAccount);

export default router;
