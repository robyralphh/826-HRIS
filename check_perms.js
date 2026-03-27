const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const hrManagerRole = await prisma.role.findFirst({
    where: { name: 'HR Manager' },
    include: { permissions: true }
  });

  if (!hrManagerRole) {
    console.log('HR Manager role not found');
    return;
  }

  console.log('HR Manager Permissions:');
  hrManagerRole.permissions.forEach(p => {
    console.log(`- ${p.module}: View=${p.canView}, Create=${p.canCreate}`);
  });
}

check().then(() => prisma.$disconnect());
