import { Router } from 'express';
import { register, login, changePassword, forgotPassword, resetPassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { getProfile, updateProfile } from '../controllers/userController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;