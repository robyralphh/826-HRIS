const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

async function main() {
    // Find the latest payroll period
    const period = await prisma.payrollPeriod.findFirst({
        orderBy: { startDate: 'desc' }
    });

    const records = await prisma.payrollRecord.findMany({
        where: { payrollPeriodId: period.id },
        include: { employee: true }
    });

    for (const r of records) {
        if (r.employee.firstName === 'Roby') {
            console.log(`Employee: ${r.employee.firstName} ${r.employee.lastName}`);
            console.log(`absentDays: ${r.absentDays}`);
            console.log(`leaveDays: ${r.leaveDays}`);
            console.log(`totalHours: ${r.totalHours}`);
            console.log(`lateHours: ${r.lateHours}`);
            console.log(`undertimeHours: ${r.undertimeHours}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
