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
import notificationRoutes from './routes/notificationRoutes'; // ✅ إضافة

dotenv.config();

const app = express();

// ⚠️ مهم: CORS يجب أن يكون أول middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// بعد CORS، باقي middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
//app.use('/api', limiter);

// قراءة JSON
app.use(express.json());

// خدمة الملفات الثابتة
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// وضع الصيانة (اختياري)
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      message: 'System is under maintenance. Please try again later.'
    });
  }
  next();
});

// مسارات API
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
app.use('/api/status', statusRoutes);
app.use('/api', shareRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ إضافة مسار الإشعارات

// مسار اختبار
app.get('/', (req, res) => {
  res.send('Project Management API is running');
});

export default app;