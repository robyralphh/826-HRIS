const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

async function main() {
    const employee = await prisma.employee.findFirst({
        where: { firstName: 'Roby', lastName: 'Belon' },
        include: { schedule: true }
    });
    console.dir(employee.schedule, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
