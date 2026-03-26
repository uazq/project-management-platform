// backend/src/jobs/archiveProjects.ts
import cron from 'node-cron';
import prisma from '../lib/prisma';

// تشغيل المهمة كل يوم في منتصف الليل
cron.schedule('0 0 * * *', async () => {
  console.log('Running archive job...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // 30 يوم مضت

    // تحديث المشاريع المكتملة التي تاريخ نهايتها قبل 30 يوم
    const result = await prisma.project.updateMany({
      where: {
        status: 'completed',
        endDate: {
          lt: thirtyDaysAgo,
        },
        archived: false,
      },
      data: {
        archived: true,
      },
    });
    console.log(`Archived ${result.count} projects.`);
  } catch (error) {
    console.error('Error in archive job:', error);
  }
});