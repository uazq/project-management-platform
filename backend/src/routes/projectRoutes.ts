import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { allowRoles } from '../middleware/role';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  archiveProject,    // ✅ استيراد الدوال الجديدة
  unarchiveProject,
} from '../controllers/projectController';

const router = Router();

router.use(authenticate);

router.post('/', allowRoles('admin', 'project_manager'), createProject);
router.get('/', getProjects); // هذه الدالة ستتعامل مع معامل archived
router.get('/:id', getProjectById);
router.put('/:id', allowRoles('admin', 'project_manager'), updateProject);
router.delete('/:id', allowRoles('admin', 'project_manager'), deleteProject);

// مسارات إدارة الأعضاء
router.post('/:id/members', allowRoles('admin', 'project_manager'), addMember);
router.delete('/:id/members/:userId', allowRoles('admin', 'project_manager'), removeMember);

// مسارات الأرشفة
router.patch('/:id/archive', allowRoles('admin', 'project_manager'), archiveProject);
router.patch('/:id/unarchive', allowRoles('admin', 'project_manager'), unarchiveProject);

export default router;