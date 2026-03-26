import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import crypto from 'crypto';

// إنشاء رابط عام لمشروع (للمدير فقط)
export const createShareLink = async (req: AuthRequest, res: Response) => {
  try {
    // تحويل req.params.id إلى رقم بأمان
    const projectId = parseInt(String(req.params.id), 10);
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project manager can share' });
    }

    // حذف أي رابط قديم للمشروع (اختياري)
    await prisma.publicShare.deleteMany({ where: { projectId } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    const share = await prisma.publicShare.create({
      data: { projectId, token, expiresAt },
    });

    const shareUrl = `${process.env.FRONTEND_URL}/public/project/${share.token}`;
    res.json({ shareUrl, token: share.token, expiresAt: share.expiresAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// الحصول على مشروع عام (بدون مصادقة)
export const getPublicProject = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    // تحويل token إلى string (لأنه قد يكون string[] إذا كان المسار يتضمن معامل متعدد)
    const tokenStr = Array.isArray(token) ? token[0] : token;

    const share = await prisma.publicShare.findUnique({
      where: { token: tokenStr },
      include: { project: true } // جلب بيانات المشروع
    });
    if (!share) return res.status(404).json({ message: 'Invalid or expired link' });
    if (share.expiresAt && share.expiresAt < new Date()) {
      await prisma.publicShare.delete({ where: { id: share.id } });
      return res.status(404).json({ message: 'Link expired' });
    }

    const project = share.project;
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      select: { title: true, description: true, status: true, priority: true, dueDate: true }
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
      },
      tasks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};