import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getActivityLog = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let whereClause: any = {};

    if (projectId) {
      whereClause.projectId = parseInt(projectId as string);
    } else if (userRole !== 'admin') {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const projectIds = userProjects.map(p => p.projectId);
      whereClause.projectId = { in: projectIds };
    }

    const activities = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, fullName: true, username: true, profilePicture: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};