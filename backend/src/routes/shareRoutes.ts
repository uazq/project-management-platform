import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createShareLink, getPublicProject } from '../controllers/shareController';

const router = Router();

router.post('/projects/:id/share', authenticate, createShareLink);
router.get('/public/project/:token', getPublicProject);

export default router;