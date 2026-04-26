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
  rejectUser, // ✅ إضافة دالة الرفض
  getAvailableMembers,
  getMemberDetails,
} from '../controllers/userController';

const upload = multer({ dest: 'uploads/temp/' });

const router = Router();

router.use(authenticate);

// ✅ مسار جلب تفاصيل العضو (يجب أن يكون قبل أي مسار يحتوي على :id)
router.get('/:id/details', getMemberDetails);

// مسار جلب المستخدمين المتاحين لمشروع معين
router.get('/projects/:projectId/available-members', getAvailableMembers);

// مسارات الأدمن
router.get('/', allowRoles('admin'), getAllUsers);
router.get('/pending', allowRoles('admin'), getPendingUsers);
router.post('/:id/approve', allowRoles('admin'), approveUser);
router.post('/:id/reject', allowRoles('admin'), rejectUser); // ✅ مسار رفض المستخدم
router.put('/:id', allowRoles('admin'), updateUser);
router.patch('/:id/toggle-active', allowRoles('admin'), toggleUserActive);
router.delete('/:id', allowRoles('admin'), deleteUser);

// مسار رفع الصورة الشخصية (للمستخدم نفسه)
router.post('/profile/picture', upload.single('profilePicture'), uploadProfilePicture);

export default router;