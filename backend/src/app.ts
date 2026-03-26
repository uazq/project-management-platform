import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import commentRoutes from './routes/commentRoutes';
import fileRoutes from './routes/fileRoutes';
import reportRoutes from './routes/reportRoutes';
import searchRoutes from './routes/searchRoutes';
import discussionRoutes from './routes/discussionRoutes';
import activityRoutes from './routes/activityRoutes';
import tagRoutes from './routes/tagRoutes';
import statusRoutes from './routes/statusRoutes';
import shareRoutes from './routes/shareRoutes';

dotenv.config();

const app = express();

// 1. Helmet للأمان (يمكن تعديله ليكون أقل صرامة)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // السماح بمشاركة الموارد عبر المصادر
}));

// 2. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 3. CORS الأساسي (للواجهة الأمامية)
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 4. Middleware لقراءة JSON
app.use(express.json());

// 5. خدمة الملفات الثابتة مع إضافة رأس CORS يدوياً
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// 6. وضع الصيانة (اختياري)
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({ 
      message: 'System is under maintenance. Please try again later.' 
    });
  }
  next();
});

// 7. مسارات API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api', commentRoutes);
app.use('/api', fileRoutes);
app.use('/api', reportRoutes);
app.use('/api', searchRoutes);
app.use('/api', discussionRoutes);
app.use('/api', activityRoutes);
app.use('/api', tagRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/status', statusRoutes);
app.use('/api', shareRoutes);
app.use('/api/search', searchRoutes);
// 8. مسار اختبار
app.get('/', (req, res) => {
  res.send('Project Management API is running');
});

export default app;