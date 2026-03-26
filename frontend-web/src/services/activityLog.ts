import prisma from '../lib/prisma';

interface LogActivityParams {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: any;
  projectId?: number;
}

export const logActivity = async ({
  userId,
  action,
  entityType,
  entityId,
  details,
  projectId,
}: LogActivityParams) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details || {},
        projectId,
      },
    });
  } catch (error) {
    console.error('❌ فشل في تسجيل النشاط:', error);
  }
};