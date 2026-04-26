import prisma from '../lib/prisma';

async function activateAllUsers() {
  const result = await prisma.user.updateMany({
    data: { isActive: true },
  });
  console.log(`✅ تم تفعيل ${result.count} مستخدم/مستخدمين`);
}

activateAllUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());