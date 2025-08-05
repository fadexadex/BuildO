import { Router } from 'express';
import { executeCode } from './controller.js';

const router = Router();

router.post('/', executeCode);

export default router;