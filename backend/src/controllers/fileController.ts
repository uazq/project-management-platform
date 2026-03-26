import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { logActivity } from '../services/activityLog';

// رفع ملفات لمشروع
export const uploadProjectFiles = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

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

    const fileRecords = await Promise.all(
      files.map(async (file) => {
        return prisma.file.create({
          data: {
            fileName: file.originalname,
            filePath: file.path,
            fileType: file.mimetype,
            size: file.size,
            uploadedBy: userId,
            projectId
          }
        });
      })
    );

    for (const file of fileRecords) {
      await logActivity({
        userId,
        action: 'UPLOAD_FILE',
        entityType: 'File',
        entityId: file.id,
        details: { fileName: file.fileName, projectId, projectName: project.name },
        projectId,
      });

      if ((global as any).io) {
        (global as any).io.emit('fileUploaded', { ...file, projectId, uploadedBy: userId });
      }
    }

    res.status(201).json(fileRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// رفع ملفات لمهمة
export const uploadTaskFiles = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(String(req.params.taskId));
    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

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

    const fileRecords = await Promise.all(
      files.map(async (file) => {
        return prisma.file.create({
          data: {
            fileName: file.originalname,
            filePath: file.path,
            fileType: file.mimetype,
            size: file.size,
            uploadedBy: userId,
            taskId
          }
        });
      })
    );

    for (const file of fileRecords) {
      await logActivity({
        userId,
        action: 'UPLOAD_FILE',
        entityType: 'File',
        entityId: file.id,
        details: { fileName: file.fileName, taskId, projectId: task.projectId, projectName: task.project.name },
        projectId: task.projectId,
      });

      if ((global as any).io) {
        (global as any).io.emit('fileUploaded', { ...file, taskId, projectId: task.projectId });
      }
    }

    res.status(201).json(fileRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض ملفات مشروع
export const getProjectFiles = async (req: AuthRequest, res: Response) => {
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

    const files = await prisma.file.findMany({
      where: { projectId },
      include: {
        uploader: { select: { id: true, fullName: true, username: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض ملفات مهمة
export const getTaskFiles = async (req: AuthRequest, res: Response) => {
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

    const files = await prisma.file.findMany({
      where: { taskId },
      include: {
        uploader: { select: { id: true, fullName: true, username: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تنزيل ملف
export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        project: { include: { members: true } },
        task: { include: { project: { include: { members: true } } } }
      }
    });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const project = file.project || file.task?.project;
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(file.filePath, file.fileName);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف ملف
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const fileId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        project: { include: { members: true } },
        task: { include: { project: { include: { members: true } } } }
      }
    });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const project = file.project || file.task?.project;
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    const isUploader = file.uploadedBy === userId;
    const isProjectManager = project.createdBy === userId;
    if (!isUploader && !isProjectManager && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot delete this file' });
    }

    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await prisma.file.delete({ where: { id: fileId } });

    await logActivity({
      userId,
      action: 'DELETE_FILE',
      entityType: 'File',
      entityId: fileId,
      details: { fileName: file.fileName, projectId: project.id, projectName: project.name },
      projectId: project.id,
    });

    if ((global as any).io) {
      (global as any).io.emit('fileDeleted', { id: fileId, projectId: project.id });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// الحصول على آخر الملفات المرفوعة (للوحة التحكم)
export const getRecentFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let projectWhereClause: any = {};
    if (userRole !== 'admin') {
      projectWhereClause = {
        members: { some: { userId } }
      };
    }

    const files = await prisma.file.findMany({
      where: {
        OR: [
          { project: projectWhereClause },
          { task: { project: projectWhereClause } }
        ]
      },
      include: {
        uploader: { select: { id: true, fullName: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, projectId: true } }
      },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};