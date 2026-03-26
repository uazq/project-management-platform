import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getActivityLog } from '../controllers/activityController';

const router = Router();

router.get('/activities', authenticate, getActivityLog);

export default router;