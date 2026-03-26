// backend/src/controllers/discussionController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activityLog';

// إنشاء مناقشة جديدة
export const createDiscussion = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const { title, content } = req.body;
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

    const discussion = await prisma.discussion.create({
      data: {
        title,
        content,
        userId,
        projectId,
      },
      include: { user: { select: { id: true, fullName: true, profilePicture: true } } },
    });

    await logActivity({
      userId,
      action: 'CREATE_DISCUSSION',
      entityType: 'Discussion',
      entityId: discussion.id,
      details: { title, projectId },
      projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('discussionCreated', discussion);
    }

    res.status(201).json(discussion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض مناقشات مشروع
export const getDiscussions = async (req: AuthRequest, res: Response) => {
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

    const discussions = await prisma.discussion.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, fullName: true, profilePicture: true } },
        replies: {
          include: { user: { select: { id: true, fullName: true, profilePicture: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(discussions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إضافة رد على مناقشة
export const addReply = async (req: AuthRequest, res: Response) => {
  try {
    const discussionId = parseInt(String(req.params.discussionId));
    const { content } = req.body;
    const userId = req.user!.userId;

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: { project: { include: { members: true } } }
    });
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const isMember = discussion.project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reply = await prisma.reply.create({
      data: {
        content,
        userId,
        discussionId,
      },
      include: { user: { select: { id: true, fullName: true, profilePicture: true } } },
    });

    await logActivity({
      userId,
      action: 'ADD_REPLY',
      entityType: 'Reply',
      entityId: reply.id,
      details: { content: content.substring(0, 50), discussionId, projectId: discussion.projectId },
      projectId: discussion.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('replyAdded', { ...reply, discussionId });
    }

    res.status(201).json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف مناقشة (لصاحبها أو مدير المشروع أو أدمن)
export const deleteDiscussion = async (req: AuthRequest, res: Response) => {
  try {
    const discussionId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: { project: { select: { createdBy: true } } }
    });
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.userId !== userId && discussion.project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot delete this discussion' });
    }

    await prisma.discussion.delete({ where: { id: discussionId } });

    await logActivity({
      userId,
      action: 'DELETE_DISCUSSION',
      entityType: 'Discussion',
      entityId: discussionId,
      details: { title: discussion.title, projectId: discussion.projectId },
      projectId: discussion.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('discussionDeleted', { id: discussionId, projectId: discussion.projectId });
    }

    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف رد (لصاحبه أو مدير المشروع أو أدمن)
export const deleteReply = async (req: AuthRequest, res: Response) => {
  try {
    const replyId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const reply = await prisma.reply.findUnique({
      where: { id: replyId },
      include: { discussion: { include: { project: { select: { createdBy: true } } } } }
    });
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const projectCreatorId = reply.discussion.project.createdBy;
    if (reply.userId !== userId && projectCreatorId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot delete this reply' });
    }

    await prisma.reply.delete({ where: { id: replyId } });

    await logActivity({
      userId,
      action: 'DELETE_REPLY',
      entityType: 'Reply',
      entityId: replyId,
      details: { discussionId: reply.discussionId, projectId: reply.discussion.projectId },
      projectId: reply.discussion.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('replyDeleted', { id: replyId, discussionId: reply.discussionId, projectId: reply.discussion.projectId });
    }

    res.json({ message: 'Reply deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};