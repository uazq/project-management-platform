// backend/src/routes/tagRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { allowRoles } from '../middleware/role';
import {
  createTag,
  getAllTags,
  updateTag,
  deleteTag,
  addTagToProject,
  removeTagFromProject,
  addTagToTask,
  removeTagFromTask,
} from '../controllers/tagController';

const router = Router();

router.use(authenticate);

router.post('/', allowRoles('admin'), createTag);
router.get('/', getAllTags);
router.put('/:id', allowRoles('admin'), updateTag);
router.delete('/:id', allowRoles('admin'), deleteTag);

router.post('/projects/:projectId/tags', addTagToProject);
router.delete('/projects/:projectId/tags/:tagId', removeTagFromProject);

router.post('/tasks/:taskId/tags', addTagToTask);
router.delete('/tasks/:taskId/tags/:tagId', removeTagFromTask);

export default router;