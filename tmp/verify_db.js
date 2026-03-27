const { PrismaClient } = require('c:/Users/Rob/826/prisma/generated-client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const records = await prisma.payrollRecord.findMany({
      orderBy: { id: 'desc' },
      take: 2,
      include: { employee: true }
    });
    
    console.log('--- Latest Payroll Records ---');
    records.forEach(r => {
      console.log(`Employee: ${r.employee.firstName} ${r.employee.lastName}`);
      console.log(`Lates: ${r.lateHours}h (Deduction: ${r.lateDeduction})`);
      console.log(`Undertime: ${r.undertimeHours}h (Deduction: ${r.undertimeDeduction})`);
      console.log(`Absences: ${r.absentDays}d (Deduction: ${r.absenceDeduction})`);
      console.log(`Net Pay: ${r.netPay}`);
      console.log('----------------------------');
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
