// backend/src/controllers/taskController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activityLog';
import { notifyUser, notifyProjectMembers } from '../services/notificationService';

// إنشاء مهمة جديدة
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const { title, description, priority, dueDate, assigneeId } = req.body;
    const createdBy = req.user!.userId;
    const creatorFullName = req.user!.fullName;

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

    await logActivity({
      userId: createdBy,
      action: 'CREATE_TASK',
      entityType: 'Task',
      entityId: task.id,
      details: { title: task.title, projectId, projectName: project.name },
      projectId,
    });

    await notifyProjectMembers(
      projectId,
      createdBy,
      'task_created',
      `📌 مهمة جديدة: "${task.title}" في مشروع "${project.name}"`,
      'Task',
      task.id,
      task.title
    );

    if (assigneeId && assigneeId !== createdBy) {
      await notifyUser(
        assigneeId,
        'task_assigned',
        `📌 تم تعيينك لمهمة "${task.title}" في مشروع "${project.name}"`,
        'Task',
        task.id,
        projectId,
        task.title
      );
    }

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
        tags: { include: { tag: true } },
        _count: { select: { comments: true, files: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    // تحويل الشكل إلى tags مباشرة
    const formattedTasks = tasks.map(t => ({
      ...t,
      tags: t.tags?.map((tt: any) => tt.tag) || []
    }));
    res.json(formattedTasks);
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
        tags: { include: { tag: true } },
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

    const formattedTask = {
      ...task,
      tags: task.tags?.map((tt: any) => tt.tag) || []
    };
    res.json(formattedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تحديث مهمة
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

    await logActivity({
      userId,
      action: 'UPDATE_TASK',
      entityType: 'Task',
      entityId: taskId,
      details: { title: updated.title, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if (assigneeId && assigneeId !== task.assigneeId) {
      await notifyUser(
        assigneeId,
        'task_assigned',
        `📌 تم تعيينك لمهمة "${updated.title}" في مشروع "${task.project.name}"`,
        'Task',
        taskId,
        task.projectId,
        updated.title
      );
    }

    if ((global as any).io) {
      (global as any).io.emit('taskUpdated', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تغيير حالة المهمة
export const changeTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.id));
    const { status } = req.body;
    const userId = req.user!.userId;
    const userFullName = req.user!.fullName;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        project: { select: { createdBy: true, name: true } },
        assignee: { select: { id: true, fullName: true } }
      }
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

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

    await logActivity({
      userId,
      action: 'UPDATE_TASK_STATUS',
      entityType: 'Task',
      entityId: taskId,
      details: { title: updated.title, newStatus: status, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if (task.assigneeId && task.assigneeId !== userId) {
      await notifyUser(
        task.assigneeId,
        'task_status_changed',
        `✅ تغيرت حالة مهمة "${task.title}" إلى ${status} في مشروع "${task.project.name}"`,
        'Task',
        taskId,
        task.projectId,
        task.title
      );
    }

    if (task.project.createdBy !== userId) {
      await notifyUser(
        task.project.createdBy,
        'task_status_changed',
        `✅ المستخدم ${userFullName} غير حالة مهمة "${task.title}" إلى ${status} في مشروع "${task.project.name}"`,
        'Task',
        taskId,
        task.projectId,
        task.title
      );
    }

    if ((global as any).io) {
      (global as any).io.emit('taskStatusChanged', { ...updated, projectId: task.projectId });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف مهمة
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

    if (task.assigneeId && task.assigneeId !== userId) {
      await notifyUser(
        task.assigneeId,
        'task_deleted',
        `🗑️ تم حذف مهمة "${task.title}" من مشروع "${task.project.name}"`,
        'Task',
        taskId,
        task.projectId,
        task.title
      );
    }

    await prisma.task.delete({ where: { id: taskId } });

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

// تعيين مسؤول للمهمة
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

    await logActivity({
      userId,
      action: 'ASSIGN_TASK',
      entityType: 'Task',
      entityId: taskId,
      details: { title: updated.title, assigneeId, projectId: task.projectId, projectName: task.project.name },
      projectId: task.projectId,
    });

    if (assigneeId && assigneeId !== userId) {
      await notifyUser(
        assigneeId,
        'task_assigned',
        `📌 تم تعيينك لمهمة "${task.title}" في مشروع "${task.project.name}"`,
        'Task',
        taskId,
        task.projectId,
        task.title
      );
    }

    if ((global as any).io) {
      (global as any).io.emit('taskAssigned', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب المهام المسندة للمستخدم الحالي (مهامي) مع الوسوم
export const getMyTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, priority } = req.query;

    let whereClause: any = { assigneeId: userId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, fullName: true } },
        tags: { include: { tag: true } }  // ✅ تأكد من وجود هذا السطر
      },
      orderBy: { dueDate: 'asc' },
    });

    const formattedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags?.map((tt: any) => tt.tag) || []
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب المهام حسب المسند إليه (assigneeId) مع الوسوم
export const getTasksByAssignee = async (req: AuthRequest, res: Response) => {
  try {
    const { assigneeId, status, priority } = req.query;
    if (!assigneeId) {
      return res.status(400).json({ message: 'assigneeId is required' });
    }
    const userId = parseInt(assigneeId as string);
    let whereClause: any = { assigneeId: userId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, fullName: true } },
        tags: { include: { tag: true } }
      },
      orderBy: { dueDate: 'asc' },
    });

    const formattedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags?.map((tt: any) => tt.tag) || []
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};