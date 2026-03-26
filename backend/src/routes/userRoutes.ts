import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { allowRoles } from '../middleware/role';
import {
  getAllUsers,
  updateUser,
  toggleUserActive,
  deleteUser,
  uploadProfilePicture
} from '../controllers/userController';

// إعداد multer للتخزين المؤقت
const upload = multer({ dest: 'uploads/temp/' });

const router = Router();

// جميع مسارات المستخدمين تتطلب مصادقة
router.use(authenticate);

// مسارات للأدمن فقط
router.get('/', allowRoles('admin'), getAllUsers);
router.put('/:id', allowRoles('admin'), updateUser);
router.patch('/:id/toggle-active', allowRoles('admin'), toggleUserActive);
router.delete('/:id', allowRoles('admin'), deleteUser);

// مسار رفع الصورة الشخصية (للمستخدم نفسه، لذا لا حاجة لدور خاص)
router.post('/profile/picture', upload.single('profilePicture'), uploadProfilePicture);

export default router;