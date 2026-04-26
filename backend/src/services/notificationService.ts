import prisma from '../lib/prisma';

interface CreateNotificationParams {
  userId: number;
  type: string;
  title?: string;
  message: string;
  entityType?: string;
  entityId?: number;
  projectId?: number;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        projectId: params.projectId,
        isRead: false,
      },
    });

    // إرسال عبر WebSocket للمستخدم إذا كان متصلاً
    const io = (global as any).io;
    if (io) {
      io.to(`user-${params.userId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('❌ فشل في إنشاء الإشعار:', error);
    return null;
  }
};

// إشعار لمستخدم واحد
export const notifyUser = async (
  userId: number,
  type: string,
  message: string,
  entityType?: string,
  entityId?: number,
  projectId?: number,
  title?: string
) => {
  return createNotification({
    userId,
    type,
    title,
    message,
    entityType,
    entityId,
    projectId,
  });
};

// إشعار لجميع أعضاء المشروع (باستثناء مستثنى)
export const notifyProjectMembers = async (
  projectId: number,
  excludeUserId: number,
  type: string,
  message: string,
  entityType?: string,
  entityId?: number,
  title?: string
) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    for (const member of members) {
      if (member.userId === excludeUserId) continue;
      await createNotification({
        userId: member.userId,
        type,
        title,
        message,
        entityType,
        entityId,
        projectId,
      });
    }
  } catch (error) {
    console.error('❌ فشل في إشعار أعضاء المشروع:', error);
  }
};