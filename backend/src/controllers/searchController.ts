// backend/src/controllers/searchController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    let projectWhereClause: any = {};
    if (userRole !== 'admin') {
      projectWhereClause = {
        members: { some: { userId } }
      };
    }

    const projects = await prisma.project.findMany({
      where: {
        AND: [
          projectWhereClause,
          { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] }
        ]
      },
      select: { id: true, name: true, description: true },
      take: 5,
    });

    const tasks = await prisma.task.findMany({
      where: {
        project: projectWhereClause,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
      },
      select: { id: true, title: true, description: true, projectId: true, project: { select: { name: true } } },
      take: 5,
    });

    const discussions = await prisma.discussion.findMany({
      where: {
        project: projectWhereClause,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }]
      },
      select: { id: true, title: true, content: true, projectId: true, project: { select: { name: true } } },
      take: 5,
    });

    const results = [
      ...projects.map(p => ({ type: 'project', id: p.id, title: p.name, description: p.description })),
      ...tasks.map(t => ({ type: 'task', id: t.id, title: t.title, description: t.description, projectId: t.projectId, projectName: t.project.name })),
      ...discussions.map(d => ({ type: 'discussion', id: d.id, title: d.title, description: d.content, projectId: d.projectId, projectName: d.project.name })),
    ];

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};