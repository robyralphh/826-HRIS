const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const roles = await prisma.role.findMany({
    include: { permissions: true }
  });

  roles.forEach(role => {
    console.log(`Role: ${role.name}`);
    role.permissions.forEach(p => {
      console.log(`  - ${p.module}: View=${p.canView}`);
    });
    console.log('---');
  });
}

check().then(() => prisma.$disconnect());
