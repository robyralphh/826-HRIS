const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

async function main() {
    const period = await prisma.payrollPeriod.findFirst({
        orderBy: { startDate: 'desc' }
    });
    console.log(`Period startDate: ${period.startDate.toISOString()}`);
    console.log(`Period endDate: ${period.endDate.toISOString()}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
