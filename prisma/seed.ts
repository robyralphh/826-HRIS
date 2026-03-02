import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const superAdmin = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Unrestricted access to all modules',
      permissions: {
        create: [
          { module: 'Employee Data', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { module: 'Payroll Management', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { module: 'Attendance & Leaves', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { module: 'User Settings', canView: true, canCreate: true, canEdit: true, canDelete: true },
        ],
      },
    },
  });

  const hrManager = await prisma.role.upsert({
    where: { name: 'HR Manager' },
    update: {},
    create: {
      name: 'HR Manager',
      description: 'Can manage employees and attendance',
      permissions: {
        create: [
          { module: 'Employee Data', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { module: 'Payroll Management', canView: true, canCreate: true, canEdit: false, canDelete: false },
          { module: 'Attendance & Leaves', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { module: 'User Settings', canView: false, canCreate: false, canEdit: false, canDelete: false },
        ],
      },
    },
  });

  console.log({ superAdmin, hrManager });

  // Create a default admin user
  const admin = await prisma.user.upsert({
    where: { email: 'robyralphh@gmail.com' },
    update: {},
    create: {
      email: 'robyralphh@gmail.com',
      username: 'Rob',
      password: 'password123', // In a real app, hash this
      roleId: superAdmin.id,
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
