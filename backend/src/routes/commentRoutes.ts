import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  addTaskComment,
  addProjectComment,
  getTaskComments,
  getProjectComments,
  deleteComment
} from '../controllers/commentController';

const router = Router();

// جميع مسارات التعليقات تحتاج مصادقة
router.use(authenticate);

// تعليقات المهام
router.post('/tasks/:taskId/comments', addTaskComment);
router.get('/tasks/:taskId/comments', getTaskComments);

// تعليقات المشاريع
router.post('/projects/:projectId/comments', addProjectComment);
router.get('/projects/:projectId/comments', getProjectComments);

// حذف تعليق
router.delete('/comments/:id', deleteComment);

export default router;