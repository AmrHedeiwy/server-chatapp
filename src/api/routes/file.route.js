import { Router } from 'express';
import mainController from '../controllers/main.controller.js';
const router = new Router();

router.post('/', mainController.uploadFile);

export default router;
