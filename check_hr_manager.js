const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const role = await prisma.role.findFirst({
    where: { name: 'HR Manager' },
    include: { permissions: true }
  });

  if (!role) {
    console.log('HR Manager role not found');
    return;
  }

  console.log(`Role: ${role.name}`);
  role.permissions.forEach(p => {
    console.log(`  - ${p.module}: View=${p.canView}`);
  });
}

check().then(() => prisma.$disconnect());
