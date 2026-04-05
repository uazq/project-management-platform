import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activityLog';

// ==================== دوال المشاريع الأساسية ====================

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
        approved: false,
        members: { create: { userId: createdBy } },
      },
      include: { members: true },
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

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { status, archived } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let whereClause: any = {};

    if (userRole !== 'admin') {
      whereClause.members = { some: { userId } };
      whereClause.approved = true;
    }

    if (status) whereClause.status = status;
    if (archived !== undefined) whereClause.archived = archived === 'true';

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, fullName: true, username: true } },
        _count: { select: { tasks: true, members: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

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
            tags: { include: { tag: true } },
          },
        },
        comments: { include: { user: { select: { id: true, fullName: true } } } },
        files: true,
        tags: { include: { tag: true } },
      },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

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

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

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

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

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

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

    const { userId } = req.body;
    const currentUserId = req.user!.userId;

    console.log(`🔍 addMember called: projectId=${projectId}, currentUserId=${currentUserId}, role=${req.user!.role}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    console.log(`📌 Project createdBy=${project.createdBy}`);

    // التحقق من الصلاحية: منشئ المشروع أو أدمن
    if (project.createdBy !== currentUserId && req.user!.role !== 'admin') {
      console.log(`❌ Access denied: createdBy=${project.createdBy}, currentUserId=${currentUserId}, role=${req.user!.role}`);
      return res.status(403).json({ message: 'Only the project creator can add members' });
    }

    const memberUserId = parseInt(String(userId), 10);
    if (isNaN(memberUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const member = await prisma.projectMember.create({
      data: { projectId, userId: memberUserId },
      include: { user: { select: { id: true, fullName: true, username: true } } },
    });

    await logActivity({
      userId: currentUserId,
      action: 'ADD_MEMBER',
      entityType: 'Member',
      details: { memberId: memberUserId, projectId, projectName: project.name },
      projectId,
    });

    if ((global as any).io) {
      (global as any).io.emit('memberAdded', { projectId, user: member.user });
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('❌ Error in addMember:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

    const userId = parseInt(String(req.params.userId), 10);
    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

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

export const archiveProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true, archived: true },
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
      select: { id: true, archived: true },
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

export const unarchiveProject = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true, archived: true },
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
      select: { id: true, archived: true },
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

export const getPendingProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const projects = await prisma.project.findMany({
      where: { approved: false },
      include: {
        creator: { select: { id: true, fullName: true, username: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveProject = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const projectId = parseInt(String(req.params.id), 10);
    if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid project ID' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.approved) {
      return res.status(400).json({ message: 'Project already approved' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { approved: true, approvedAt: new Date() },
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'APPROVE_PROJECT',
      entityType: 'Project',
      entityId: projectId,
      details: { name: project.name },
      projectId,
    });

    if ((global as any).io) {
      (global as any).io.to(`user-${project.createdBy}`).emit('projectApproved', {
        projectId,
        projectName: project.name,
      });
    }

    res.json({ message: 'Project approved successfully', project: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== دوال طلب حذف العضو ====================

export const createRemovalRequest = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id), 10);
    const memberId = parseInt(String(req.params.userId), 10);
    if (isNaN(projectId) || isNaN(memberId)) {
      return res.status(400).json({ message: 'Invalid project or user ID' });
    }

    const requesterId = req.user!.userId;
    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true, name: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.createdBy !== requesterId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only project manager can request member removal' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
    });
    if (!membership) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    const existingRequest = await prisma.memberRemovalRequest.findFirst({
      where: { projectId, userId: memberId, status: 'pending' },
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'A removal request for this member is already pending' });
    }

    const request = await prisma.memberRemovalRequest.create({
      data: {
        projectId,
        userId: memberId,
        requestedBy: requesterId,
        reason,
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
        requester: { select: { id: true, fullName: true } },
      },
    });

    if ((global as any).io) {
      (global as any).io.emit('newRemovalRequest', {
        projectId,
        projectName: project.name,
        memberName: request.user.fullName,
        requesterName: request.requester.fullName,
      });
    }

    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRemovalRequests = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔍 getRemovalRequests called');
    console.log('User role:', req.user?.role);
    
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { status } = req.query;
    console.log('Raw status query:', status, 'type:', typeof status);
    
    let whereClause: any = {};
    
    if (status !== undefined && status !== null && status !== '') {
      // تحويل آمن إلى سلسلة نصية
      let statusStr: string;
      if (Array.isArray(status)) {
        statusStr = String(status[0]);
      } else {
        statusStr = String(status);
      }
      console.log('Converted status string:', statusStr);
      
      // قبول القيم الصالحة فقط
      if (['pending', 'approved', 'rejected'].includes(statusStr)) {
        whereClause.status = statusStr;
      } else {
        console.log('Invalid status value:', statusStr);
        return res.status(400).json({ 
          message: `Invalid status value: "${statusStr}". Allowed: pending, approved, rejected` 
        });
      }
    }

    console.log('Final whereClause:', whereClause);
    
    const requests = await prisma.memberRemovalRequest.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true, createdBy: true } },
        user: { select: { id: true, fullName: true, username: true, email: true } },
        requester: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`✅ Found ${requests.length} requests`);
    res.json(requests);
  } catch (error) {
    console.error('❌ Error in getRemovalRequests:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const handleRemovalRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const requestId = parseInt(String(req.params.id), 10);
    if (isNaN(requestId)) return res.status(400).json({ message: 'Invalid request ID' });

    const { action } = req.body; // 'approve' or 'reject'

    const request = await prisma.memberRemovalRequest.findUnique({
      where: { id: requestId },
      include: { project: true, user: true },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    if (action === 'approve') {
      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: request.projectId,
            userId: request.userId,
          },
        },
      });
      await prisma.memberRemovalRequest.update({
        where: { id: requestId },
        data: { status: 'approved', approvedBy: req.user!.userId },
      });
      await logActivity({
        userId: req.user!.userId,
        action: 'APPROVE_REMOVAL_REQUEST',
        entityType: 'Member',
        details: {
          projectId: request.projectId,
          projectName: request.project.name,
          memberName: request.user.fullName,
        },
        projectId: request.projectId,
      });
      if ((global as any).io) {
        (global as any).io.to(`user-${request.requestedBy}`).emit('removalRequestApproved', {
          projectId: request.projectId,
          projectName: request.project.name,
          memberName: request.user.fullName,
        });
      }
      res.json({ message: 'Member removed successfully' });
    } else if (action === 'reject') {
      await prisma.memberRemovalRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', approvedBy: req.user!.userId },
      });
      res.json({ message: 'Request rejected' });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};