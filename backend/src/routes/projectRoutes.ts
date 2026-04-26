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
  archiveProject,
  unarchiveProject,
  getPendingProjects,
  approveProject,
  rejectProject, // ✅ إضافة دالة الرفض
  createRemovalRequest,
  getRemovalRequests,
  handleRemovalRequest,
} from '../controllers/projectController';

const router = Router();

router.use(authenticate);

// ==================== مسارات المشاريع العامة (بدون معرّف) ====================
// يجب أن تأتي هذه المسارات قبل أي مسار يحتوي على :id

router.post('/', allowRoles('admin', 'project_manager'), createProject);
router.get('/', getProjects);
router.get('/pending', allowRoles('admin'), getPendingProjects);
router.get('/removal-requests', allowRoles('admin'), getRemovalRequests);   // ✅ قبل /:id

// ==================== مسارات المشاريع التي تحتوي على :id ====================
router.get('/:id', getProjectById);
router.put('/:id', allowRoles('admin', 'project_manager'), updateProject);
router.delete('/:id', allowRoles('admin', 'project_manager'), deleteProject);
router.post('/:id/approve', allowRoles('admin'), approveProject);
router.post('/:id/reject', allowRoles('admin'), rejectProject); // ✅ مسار رفض المشروع
router.patch('/:id/archive', allowRoles('admin', 'project_manager'), archiveProject);
router.patch('/:id/unarchive', allowRoles('admin', 'project_manager'), unarchiveProject);

// ==================== مسارات الأعضاء ====================
router.post('/:id/members', allowRoles('admin', 'project_manager'), addMember);
router.delete('/:id/members/:userId', allowRoles('admin', 'project_manager'), removeMember);
router.post('/:id/members/:userId/removal-request', allowRoles('admin', 'project_manager'), createRemovalRequest);

// ==================== مسار معالجة طلبات الحذف (لا يحتوي على :id) ====================
router.patch('/removal-requests/:id', allowRoles('admin'), handleRemovalRequest);

export default router;