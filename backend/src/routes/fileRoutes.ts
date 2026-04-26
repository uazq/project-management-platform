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

// مسارات رفع الملفات
router.post('/projects/:projectId/files', upload.array('files', 10), uploadProjectFiles);
router.post('/tasks/:taskId/files', upload.array('files', 10), uploadTaskFiles);

// باقي المسارات
router.get('/projects/:projectId/files', getProjectFiles);
router.get('/tasks/:taskId/files', getTaskFiles);
router.get('/files/:id/download', downloadFile);
router.delete('/files/:id', deleteFile);
router.get('/files/recent', getRecentFiles);

export default router;