const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Payroll Settings...');
  const nd = await prisma.payrollSetting.upsert({
    where: { name: 'Night Differential' },
    update: {},
    create: {
      name: 'Night Differential',
      percentage: 10,
      startTime: '22:00',
      endTime: '06:00',
      isActive: true
    }
  });
  console.log('Night Differential Setting:', nd);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
