// backend/src/controllers/taskController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activityLog';

// إنشاء مهمة جديدة
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const { title, description, priority, dueDate, assigneeId } = req.body;
    const createdBy = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true }
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.createdBy !== createdBy && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project manager can create tasks' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        createdBy,
        status: 'not_started'
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        creator: { select: { id: true, fullName: true } }
      }
    });

    // تسجيل النشاط
    await logActivity({
      userId: createdBy,
      action: 'CREATE_TASK',
      entityType: 'Task',
      entityId: task.id,
      details: { title: task.title, projectId, projectName: project.name },
      projectId,
    });

    // بث عبر WebSocket
    if ((global as any).io) {
      (global as any).io.emit('taskCreated', task);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض مهام مشروع معين (مع تصفية)
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const { status, assigneeId } = req.query;
    const userId = req.user!.userId;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });
    if (!membership && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    let whereClause: any = { projectId };
    if (status) whereClause.status = status;
    if (assigneeId) whereClause.assigneeId = parseInt(String(assigneeId));

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        creator: { select: { id: true, fullName: true } },
        _count: { select: { comments: true, files: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض تفاصيل مهمة محددة
export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true, username: true } },
        creator: { select: { id: true, fullName: true } },
        comments: {
          include: { user: { select: { id: true, fullName: true, profilePicture: true } } },
          orderBy: { createdAt: 'desc' }
        },
        files: true
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } }
    });
    if (!membership && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تحديث مهمة (مدير المشروع أو المسؤول عن المهمة أو أدمن)
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.id));
    const { title, description, priority, dueDate, assigneeId, status } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { createdBy: true, name: true } } }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isProjectManager = task.project.createdBy === userId;
    const isAssignee = task.assigneeId === userId;
    if (!isProjectManager && !isAssignee && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update this task' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId,
        status
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
        creator: { select: { id: true, fullName: true } }
      }
    });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'UPDATE_TASK',
      entityType: 'Task',
      entityId: taskId,
      details: { title: updated.title, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('taskUpdated', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تغيير حالة المهمة (يسمح للمسند إليه ومدير المشروع والأدمن)
export const changeTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.id));
    const { status } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { createdBy: true, name: true } } }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // التحقق من الصلاحية: المسند إليه أو مدير المشروع أو أدمن
    const isAssignee = task.assigneeId === userId;
    const isProjectManager = task.project.createdBy === userId;
    if (!isAssignee && !isProjectManager && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You are not allowed to change this task status' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      select: { id: true, status: true, title: true, projectId: true }
    });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'UPDATE_TASK_STATUS',
      entityType: 'Task',
      entityId: taskId,
      details: { title: updated.title, newStatus: status, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('taskStatusChanged', { ...updated, projectId: task.projectId });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف مهمة (مدير المشروع فقط)
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { createdBy: true, name: true } } }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project manager can delete tasks' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'DELETE_TASK',
      entityType: 'Task',
      entityId: taskId,
      details: { title: task.title, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('taskDeleted', { id: taskId, projectId: task.projectId });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تعيين مسؤول للمهمة (مدير المشروع فقط)
export const assignTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.id));
    const { assigneeId } = req.body;
    const userId = req.user!.userId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { createdBy: true, name: true } } }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project manager can assign tasks' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId },
      include: { assignee: { select: { id: true, fullName: true } } }
    });

    // تسجيل النشاط
    await logActivity({
      userId,
      action: 'ASSIGN_TASK',
      entityType: 'Task',
      entityId: taskId,
      details: { title: updated.title, assigneeId, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('taskAssigned', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};