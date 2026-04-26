import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

// جلب إشعارات المستخدم الحالي
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.notification.count({ where });

    res.json({
      data: notifications,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// جلب عدد الإشعارات غير المقروءة
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تحديث إشعار كمقروء
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(String(req.params.id));

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// تحديث جميع الإشعارات كمقروءة
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// حذف إشعار
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(String(req.params.id));

    await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};