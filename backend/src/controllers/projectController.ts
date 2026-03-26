import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activityLog';

// إنشاء مشروع جديد
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, startDate, endDate, status } = req.body;
    const createdBy = req.user!.userId;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        createdBy,
        members: {
          create: {
            userId: createdBy,
          },
        },
      },
      include: {
        members: true,
      },
    });

    await logActivity({
      userId: createdBy,
      action: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: project.id,
      details: { name: project.name },
      projectId: project.id,
    });

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض جميع المشاريع (مع تصفية حسب الصلاحية والأرشفة)
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { status, archived } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let whereClause: any = {};

    if (userRole !== 'admin') {
      whereClause.members = { some: { userId } };
    }

    if (status) {
      whereClause.status = status;
    }

    if (archived !== undefined) {
      whereClause.archived = archived === 'true';
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, fullName: true, username: true } },
        _count: { select: { tasks: true, members: true } },
        tags: { include: { tag: true } }, // تضمين الوسوم
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// عرض تفاصيل مشروع محدد
export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, fullName: true, username: true } },
        members: { include: { user: { select: { id: true, fullName: true, username: true, profilePicture: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, fullName: true } },
            creator: { select: { id: true, fullName: true } },
            tags: { include: { tag: true } }, // تضمين وسوم المهام
          },
        },
        comments: { include: { user: { select: { id: true, fullName: true } } } },
        files: true,
        tags: { include: { tag: true } }, // تضمين وسوم المشروع
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (req.user!.role !== 'admin' && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تعديل مشروع
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const { name, description, startDate, endDate, status } = req.body;
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the project creator can update' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        status,
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE_PROJECT',
      entityType: 'Project',
      entityId: projectId,
      details: { name: updated.name },
      projectId,
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف مشروع
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the project creator can delete' });
    }

    await prisma.project.delete({ where: { id: projectId } });

    await logActivity({
      userId,
      action: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: projectId,
      details: { name: project.name },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إضافة عضو للمشروع
export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const { userId } = req.body;
    const currentUserId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== currentUserId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the project creator can add members' });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
      },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });

    await logActivity({
      userId: currentUserId,
      action: 'ADD_MEMBER',
      entityType: 'Member',
      details: { memberId: userId, projectId, projectName: project.name },
      projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('memberAdded', { projectId, user: member.user });
    }

    res.status(201).json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إزالة عضو من المشروع
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = parseInt(String(req.params.userId));
    const currentUserId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== currentUserId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the project creator can remove members' });
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    await logActivity({
      userId: currentUserId,
      action: 'REMOVE_MEMBER',
      entityType: 'Member',
      details: { memberId: userId, projectId, projectName: project.name },
      projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('memberRemoved', { projectId, userId });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// أرشفة مشروع
export const archiveProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true, archived: true }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project creator can archive' });
    }
    if (project.archived) {
      return res.status(400).json({ message: 'Project already archived' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { archived: true },
      select: { id: true, archived: true }
    });

    await logActivity({
      userId,
      action: 'ARCHIVE_PROJECT',
      entityType: 'Project',
      entityId: projectId,
      details: { name: project.name },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// إلغاء أرشفة مشروع
export const unarchiveProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true, archived: true }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.createdBy !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project creator can unarchive' });
    }
    if (!project.archived) {
      return res.status(400).json({ message: 'Project is not archived' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { archived: false },
      select: { id: true, archived: true }
    });

    await logActivity({
      userId,
      action: 'UNARCHIVE_PROJECT',
      entityType: 'Project',
      entityId: projectId,
      details: { name: project.name },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};