import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { logActivity } from '../services/activityLog';
import { notifyUser } from '../services/notificationService';

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
        isApproved: true,
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

// جلب المستخدمين المعلقين (لأدمن فقط)
export const getPendingUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const users = await prisma.user.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// الموافقة على مستخدم (لأدمن فقط)
export const approveUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const userId = parseInt(String(req.params.id));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isApproved) {
      return res.status(400).json({ message: 'User already approved' });
    }
    const updated = await prisma.user.update({
  where: { id: userId },
  data: { isApproved: true, isActive: true },
});
    await logActivity({
      userId: req.user!.userId,
      action: 'APPROVE_USER',
      entityType: 'User',
      entityId: userId,
      details: { fullName: user.fullName },
    });

    await notifyUser(
      userId,
      'user_approved',
      `✅ تمت الموافقة على حسابك. يمكنك الآن تسجيل الدخول إلى النظام.`,
      'User',
      userId,
      undefined,
      'تم قبول حسابك'
    );

    res.json({ message: 'User approved successfully', user: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ رفض مستخدم (لأدمن فقط) – حذف المستخدم
export const rejectUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const userId = parseInt(String(req.params.id));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isApproved) {
      return res.status(400).json({ message: 'User is already approved, cannot reject' });
    }
    // حذف المستخدم (يمكن تغيير إلى تعطيل إذا أردت)
    await prisma.user.delete({ where: { id: userId } });

    await logActivity({
      userId: req.user!.userId,
      action: 'REJECT_USER',
      entityType: 'User',
      entityId: userId,
      details: { fullName: user.fullName },
    });
    res.json({ message: 'User rejected and deleted successfully' });
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
        isApproved: true,
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
        isApproved: true,
        profilePicture: true,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// رفع الصورة الشخصية
export const uploadProfilePicture = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'لم يتم رفع ملف' });
    }

    const uploadDir = path.join(__dirname, '../../uploads/profile');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `profile-${userId}-${Date.now()}${fileExt}`;
    const finalPath = path.join(uploadDir, fileName);
    fs.renameSync(file.path, finalPath);

    const profilePicturePath = `/uploads/profile/${fileName}`;
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePicturePath },
    });

    res.json({ profilePicture: profilePicturePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// جلب تفاصيل عضو معين (للمشرفين أو مديري المشاريع)
export const getMemberDetails = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = parseInt(String(req.params.id), 10);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        profilePicture: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!member) {
      return res.status(404).json({ message: 'User not found' });
    }

    let projectWhereClause: any = {};
    if (currentUserRole !== 'admin') {
      projectWhereClause = {
        members: { some: { userId: currentUserId } },
        AND: { members: { some: { userId: memberId } } },
      };
    } else {
      projectWhereClause = {
        members: { some: { userId: memberId } },
      };
    }

    const projects = await prisma.project.findMany({
      where: projectWhereClause,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tasks = await prisma.task.findMany({
      where: { assigneeId: memberId },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    res.json({
      member,
      projects,
      tasks,
      stats: {
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// جلب المستخدمين المتاحين للإضافة إلى مشروع معين (ليسوا أعضاء بالفعل)
export const getAvailableMembers = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId), 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true },
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (project.createdBy !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You are not allowed to add members to this project' });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    const memberIds = members.map(m => m.userId);

    const availableUsers = await prisma.user.findMany({
      where: {
        id: { notIn: memberIds },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        profilePicture: true,
      },
      orderBy: { fullName: 'asc' },
    });

    res.json(availableUsers);
  } catch (error) {
    console.error('Error in getAvailableMembers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};