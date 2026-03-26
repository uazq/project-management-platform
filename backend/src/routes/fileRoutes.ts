import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  uploadProjectFiles,
  uploadTaskFiles,
  getProjectFiles,
  getTaskFiles,
  downloadFile,
  deleteFile,
  getRecentFiles
} from '../controllers/fileController';

const router = Router();

router.use(authenticate);

// رفع ملفات لمشروع
router.post('/projects/:projectId/files', upload.array('files', 10), uploadProjectFiles);

// رفع ملفات لمهمة
router.post('/tasks/:taskId/files', upload.array('files', 10), uploadTaskFiles);

// عرض ملفات مشروع
router.get('/projects/:projectId/files', getProjectFiles);

// عرض ملفات مهمة
router.get('/tasks/:taskId/files', getTaskFiles);

// تنزيل ملف
router.get('/files/:id/download', downloadFile);

// حذف ملف
router.delete('/files/:id', deleteFile);

// آخر الملفات المرفوعة (للوحة التحكم)
router.get('/files/recent', getRecentFiles);

export default router;