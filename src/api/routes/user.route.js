import { Router } from 'express';
const router = new Router();
import profileController from '../controllers/user.controller.js';

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /user/view
 * Controller: profileController.view
 */
router.get('/current', profileController.current);

/**
 * Retrieves and displays the user's profile.
 * Endpoint: GET /user/view
 * Controller: profileController.view
 */
router.get('/search', profileController.search);

/**
 * Edits the user's profile.
 * Endpoint: PATCH /user/edit
 * Controller: profileController.edit
 */
router.post('/edit', profileController.edit);

/**
 * Changes the user's password.
 * Endpoint: POST /user/change-password
 * Controller: profileController.changePassword
 */
router.post('/change-password', profileController.changePassword);

/**
 * Deletes the user's account.
 * Endpoint: POST /user/delete-account
 * Controller: profileController.changePassword
 */
router.post('/delete-account', profileController.deleteAccount);

export default router;
