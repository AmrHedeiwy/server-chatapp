import { Router } from 'express';
const router = new Router();
import profileController from '../controllers/profile.controller.js';

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /profile/view
 * Controller: profileController.view
 */
router.get('/view', profileController.view);

/**
 * Edits the user's profile.
 * Endpoint: PATCH /profile/edit
 * Controller: profileController.edit
 */
router.post('/edit', profileController.edit);

/**
 * Changes the user's password.
 * Endpoint: POST /profile/change-password
 * Controller: profileController.changePassword
 */
router.post('/change-password', profileController.changePassword);

/**
 * Deletes the user's account.
 * Endpoint: POST /profile/delete-account
 * Controller: profileController.changePassword
 */
router.post('/delete-account', profileController.deleteAccount);

export default router;
