import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { allowRoles } from '../middleware/role';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  changeTaskStatus,
  deleteTask,
  assignTask
} from '../controllers/taskController';

const router = Router();

router.use(authenticate);

// مسارات تحت المشروع
router.post('/projects/:projectId/tasks', allowRoles('admin', 'project_manager'), createTask);
router.get('/projects/:projectId/tasks', getTasks);

// مسارات مباشرة للمهمة
router.get('/tasks/:id', getTaskById);
router.put('/tasks/:id', updateTask);
router.patch('/tasks/:id/status', changeTaskStatus); // ✅ هنا نستخدم changeTaskStatus
router.delete('/tasks/:id', allowRoles('admin', 'project_manager'), deleteTask);
router.put('/tasks/:id/assign', allowRoles('admin', 'project_manager'), assignTask);

export default router;