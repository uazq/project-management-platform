import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { allowRoles } from '../middleware/role';
import {
  getAllUsers,
  updateUser,
  toggleUserActive,
  deleteUser,
  uploadProfilePicture,
  getPendingUsers,
  approveUser,
  getAvailableMembers, // ✅ استيراد الدالة الجديدة
} from '../controllers/userController';

const upload = multer({ dest: 'uploads/temp/' });

const router = Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticate);

// ✅ مسار جلب المستخدمين المتاحين لمشروع معين (يجب أن يكون قبل أي مسار يحتوي على :id)
router.get('/projects/:projectId/available-members', getAvailableMembers);

// مسارات الأدمن
router.get('/', allowRoles('admin'), getAllUsers);
router.get('/pending', allowRoles('admin'), getPendingUsers);
router.post('/:id/approve', allowRoles('admin'), approveUser);
router.put('/:id', allowRoles('admin'), updateUser);
router.patch('/:id/toggle-active', allowRoles('admin'), toggleUserActive);
router.delete('/:id', allowRoles('admin'), deleteUser);

// مسار رفع الصورة الشخصية (للمستخدم نفسه)
router.post('/profile/picture', upload.single('profilePicture'), uploadProfilePicture);

export default router;