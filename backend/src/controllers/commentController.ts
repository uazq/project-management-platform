// backend/src/controllers/commentController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activityLog';

// إضافة تعليق على مهمة
export const addTaskComment = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.taskId));
    const { content } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isMember = task.project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        taskId
      },
      include: {
        user: { select: { id: true, fullName: true, profilePicture: true } }
      }
    });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'ADD_COMMENT',
      entityType: 'Comment',
      entityId: comment.id,
      details: { content: content.substring(0, 50) + (content.length > 50 ? '...' : ''), taskId, projectId: task.projectId },
      projectId: task.projectId,
    });

    // بث عبر WebSocket
    if ((global as any).io) {
      (global as any).io.emit('commentAdded', { ...comment, projectId: task.projectId, taskId });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إضافة تعليق على مشروع
export const addProjectComment = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const { content } = req.body;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        projectId
      },
      include: {
        user: { select: { id: true, fullName: true, profilePicture: true } }
      }
    });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'ADD_COMMENT',
      entityType: 'Comment',
      entityId: comment.id,
      details: { content: content.substring(0, 50) + (content.length > 50 ? '...' : ''), projectId },
      projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('commentAdded', { ...comment, projectId });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض تعليقات مهمة
export const getTaskComments = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.taskId));
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isMember = task.project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, fullName: true, profilePicture: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض تعليقات مشروع
export const getProjectComments = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await prisma.comment.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, fullName: true, profilePicture: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف تعليق
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: { include: { project: true } },
        project: true
      }
    });
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const project = comment.project || comment.task?.project;
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    const isOwner = comment.userId === userId;
    const isProjectManager = project.createdBy === userId;
    if (!isOwner && !isProjectManager && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot delete this comment' });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'DELETE_COMMENT',
      entityType: 'Comment',
      entityId: commentId,
      details: { contentPreview: comment.content.substring(0, 30) + '...', projectId: project.id },
      projectId: project.id,
    });

    if ((global as any).io) {
      (global as any).io.emit('commentDeleted', { id: commentId, projectId: project.id });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};