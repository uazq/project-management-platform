import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { search } from '../controllers/searchController';

const router = Router();

router.get('/', authenticate, search);

export default router;