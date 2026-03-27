const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

async function main() {
    const employee = await prisma.employee.findFirst({
        where: { firstName: 'Roby', lastName: 'Belon' }
    });

    const attendances = await prisma.attendance.findMany({
        where: { employeeId: employee.id }
    });

    for (const a of attendances) {
        const phDate = new Date(a.date.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
        console.log(`Date: ${phDate} | status: ${a.status} | timeIn: ${!!a.timeIn} | timeOut: ${!!a.timeOut}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
