import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createDiscussion,
  getDiscussions,
  addReply,
  deleteDiscussion,
  deleteReply,
} from '../controllers/discussionController';

const router = Router();

router.use(authenticate);

router.post('/projects/:projectId/discussions', createDiscussion);
router.get('/projects/:projectId/discussions', getDiscussions);
router.post('/discussions/:discussionId/replies', addReply);
router.delete('/discussions/:id', deleteDiscussion);
router.delete('/replies/:id', deleteReply);

export default router;