import { Router } from 'express';
const router = new Router();
import profileController from '../controllers/profile.controller.js';

router.get('/view', profileController.view);

export default router;
