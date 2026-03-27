const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPermissions() {
  const roles = await prisma.role.findMany();
  
  const hrModules = [
      'Dashboard (HR)',
      'Employee List',
      'Company Structure',
      'Benefits',
      'Daily Attendance',
      'Daily Time Record (HR)',
      'Schedules',
      'Time Requests'
  ];

  for (const role of roles) {
    if (role.name === 'HR Manager' || role.name === 'HR' || role.name === 'Human Resources') {
      console.log(`Fixing permissions for ${role.name}...`);
      
      for (const mod of hrModules) {
        // Upsert permission
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: role.id, module: mod }
        });
        
        if (existing) {
          await prisma.rolePermission.update({
            where: { id: existing.id },
            data: { canView: true, canCreate: true, canEdit: true, canDelete: true }
          });
        } else {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              module: mod,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true
            }
          });
        }
      }
    }
  }
  
  console.log('Fixed HR Manager permissions.');
}

fixPermissions().catch(console.error).finally(() => prisma.$disconnect());
