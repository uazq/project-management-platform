import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';

// عرض جميع المستخدمين (للأدمن فقط)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        profilePicture: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تعديل مستخدم (للأدمن فقط)
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(String(req.params.id));
    const { fullName, email, role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { fullName, email, role, isActive },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تعطيل/تفعيل مستخدم (للأدمن فقط)
export const toggleUserActive = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(String(req.params.id));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    if (!updated.isActive && (global as any).io) {
      (global as any).io.to(`user-${userId}`).emit('userDeactivated', {
        message: 'Your account has been deactivated by admin.'
      });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف مستخدم (للأدمن فقط)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(String(req.params.id));
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// الحصول على الملف الشخصي للمستخدم الحالي
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        profilePicture: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تحديث الملف الشخصي
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, profilePicture } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { fullName, email, profilePicture },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        profilePicture: true,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// رفع الصورة الشخصية (بدون sharp لتجنب المشاكل)
export const uploadProfilePicture = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'لم يتم رفع ملف' });
    }

    // إنشاء مجلد uploads/profile إذا لم يكن موجوداً
    const uploadDir = path.join(__dirname, '../../uploads/profile');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // إنشاء اسم فريد للملف مع الاحتفاظ بالامتداد الأصلي
    const fileExt = path.extname(file.originalname);
    const fileName = `profile-${userId}-${Date.now()}${fileExt}`;
    const finalPath = path.join(uploadDir, fileName);

    // نقل الملف من المسار المؤقت إلى المسار النهائي
    fs.renameSync(file.path, finalPath);

    // تحديث مسار الصورة في قاعدة البيانات
    const profilePicturePath = `/uploads/profile/${fileName}`;
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePicturePath },
    });

    res.json({ profilePicture: profilePicturePath });
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة:', error);
    res.status(500).json({ message: 'Server error', error: String(error) });
  }
};