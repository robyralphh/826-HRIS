const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
  const hrManagerRole = await prisma.role.findFirst({
    where: { name: 'HR Manager' },
    include: { permissions: true }
  });

  if (!hrManagerRole) {
    console.log('HR Manager role not found');
    return;
  }

  console.log(`Repairing permissions for ${hrManagerRole.name}...`);

  // Define essential permissions that might be missing or set to false
  const essentialPerms = [
    { module: 'My ESS Portal', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'Dashboard (HR)', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'Employee List', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'Schedules', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'Time Requests', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'Daily Attendance', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { module: 'Daily Time Record (HR)', canView: true, canCreate: true, canEdit: true, canDelete: true },
  ];

  for (const perm of essentialPerms) {
    const existing = hrManagerRole.permissions.find(p => p.module === perm.module);
    if (!existing) {
      console.log(`Adding missing permission: ${perm.module}`);
      await prisma.rolePermission.create({
        data: {
          roleId: hrManagerRole.id,
          ...perm
        }
      });
    } else if (!existing.canView) {
      console.log(`Enabling disabled permission: ${perm.module}`);
      await prisma.rolePermission.update({
        where: { id: existing.id },
        data: { canView: true, canCreate: true, canEdit: true, canDelete: true }
      });
    } else {
      console.log(`Permission ${perm.module} is already OK.`);
    }
  }

  console.log('Repair complete!');
}

repair().then(() => prisma.$disconnect());
