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
router.patch('/edit', profileController.edit);

export default router;
