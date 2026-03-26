import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

// لوحة المعلومات العامة (Dashboard)
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let projectWhereClause: any = {};
    if (userRole !== 'admin') {
      projectWhereClause = {
        members: { some: { userId } }
      };
    }

    const projects = await prisma.project.findMany({
      where: projectWhereClause,
      include: {
        tasks: true,
        members: true
      }
    });

    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const suspendedProjects = projects.filter(p => p.status === 'suspended').length;
    const totalProjects = projects.length;

    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    const today = new Date();

    projects.forEach(project => {
      totalTasks += project.tasks.length;
      completedTasks += project.tasks.filter(t => t.status === 'completed').length;
      overdueTasks += project.tasks.filter(t => 
        t.status !== 'completed' && t.dueDate && t.dueDate < today
      ).length;
    });

    const pendingTasks = totalTasks - completedTasks;

    let memberStats: any[] = [];
    if (userRole === 'admin' || userRole === 'project_manager') {
      const members = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'team_member' },
            { role: 'project_manager' }
          ]
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          profilePicture: true,
          assignedTasks: {
            where: {
              project: projectWhereClause
            },
            select: {
              status: true
            }
          }
        }
      });

      memberStats = members.map(member => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username,
        profilePicture: member.profilePicture,
        totalTasks: member.assignedTasks.length,
        completedTasks: member.assignedTasks.filter(t => t.status === 'completed').length
      }));
    }

    const projectProgress = projects.map(project => {
      const total = project.tasks.length;
      const completed = project.tasks.filter(t => t.status === 'completed').length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        totalTasks: total,
        completedTasks: completed,
        progress
      };
    });

    res.json({
      projects: {
        active: activeProjects,
        completed: completedProjects,
        suspended: suspendedProjects,
        total: totalProjects
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks
      },
      projectProgress,
      memberStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تقرير مشروع محدد
export const getProjectReport = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(String(req.params.id));
    const userId = req.user!.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, fullName: true, username: true } },
        members: { include: { user: { select: { id: true, fullName: true, username: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, fullName: true } },
            comments: true,
            files: true
          }
        },
        comments: { include: { user: { select: { id: true, fullName: true } } } },
        files: { include: { uploader: { select: { id: true, fullName: true } } } }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = new Date();
    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && t.dueDate && t.dueDate < today
    ).length;

    const tasksByStatus = {
      not_started: tasks.filter(t => t.status === 'not_started').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: completedTasks,
      overdue: overdueTasks
    };

    const tasksByPriority = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    };

    const memberPerformance = project.members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.userId);
      return {
        userId: member.userId,
        fullName: member.user.fullName,
        username: member.user.username,
        totalTasks: memberTasks.length,
        completedTasks: memberTasks.filter(t => t.status === 'completed').length,
        pendingTasks: memberTasks.filter(t => t.status !== 'completed').length
      };
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        createdBy: project.creator,
        createdAt: project.createdAt
      },
      stats: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
      },
      tasksByStatus,
      tasksByPriority,
      memberPerformance,
      commentsCount: project.comments.length,
      filesCount: project.files.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تقرير أداء الفريق (لأدمن أو مدير مشروع)
export const getTeamPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let projectWhereClause: any = {};
    if (userRole !== 'admin') {
      projectWhereClause = {
        members: { some: { userId } }
      };
    }

    const members = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'team_member' },
          { role: 'project_manager' }
        ]
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        profilePicture: true,
        assignedTasks: {
          where: {
            project: projectWhereClause
          },
          include: {
            project: { select: { name: true } }
          }
        },
        projectMembers: {
          where: projectWhereClause,
          include: { project: { select: { name: true } } }
        }
      }
    });

    const report = members.map(member => {
      const tasks = member.assignedTasks;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const pending = tasks.filter(t => t.status !== 'completed').length;
      const overdue = tasks.filter(t => 
        t.status !== 'completed' && t.dueDate && t.dueDate < new Date()
      ).length;

      return {
        userId: member.id,
        fullName: member.fullName,
        username: member.username,
        profilePicture: member.profilePicture,
        projects: member.projectMembers.map(pm => pm.project.name),
        tasksStats: {
          total: tasks.length,
          completed,
          pending,
          overdue,
          completionRate: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100)
        },
        recentTasks: tasks.slice(0, 5).map(t => ({
          title: t.title,
          project: t.project.name,
          status: t.status,
          dueDate: t.dueDate
        }))
      };
    });

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// دالة المخطط الخطي (Timeline)
export const getTaskTimeline = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ تصحيح الخطأ: تحويل req.params.projectId إلى string
    const projectId = parseInt(String(req.params.projectId));
    
    // هنا يمكنك جلب البيانات الفعلية من قاعدة البيانات
    // مثال بسيط: إنشاء بيانات آخر 7 أيام وهمية
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    // بيانات وهمية (يمكن استبدالها باستعلام حقيقي)
    const data = dates.map(date => ({
      date,
      completed: Math.floor(Math.random() * 10),
      created: Math.floor(Math.random() * 15),
    }));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};