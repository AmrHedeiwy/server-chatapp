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
 * Updates the user's avatar.
 * Endpoint: POST /users/edit
 */
router.post('/avatar', mainController.changeAvatar);

/**
 * Changes the user's password.
 * Endpoint: PATCH /users/password/change
 */
router.patch('/password', mainController.changePassword);

/**
 * Deletes the user's account.
 * Endpoint: DElETE /users/delete
 */
router.delete('/delete', mainController.deleteAccount);

export default router;
