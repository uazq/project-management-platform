import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { allowRoles } from '../middleware/role';
import {
  getDashboardStats,
  getProjectReport,
  getTeamPerformance,
  getTaskTimeline
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);

// لوحة المعلومات العامة
router.get('/dashboard/stats', getDashboardStats);

// تقرير مشروع محدد
router.get('/projects/:id/report', getProjectReport);

// تقرير أداء الفريق (لأدمن أو مدير مشروع)
router.get('/reports/team-performance', allowRoles('admin', 'project_manager'), getTeamPerformance);

// المخطط الخطي للمهام
router.get('/projects/:projectId/timeline', getTaskTimeline);

export default router;