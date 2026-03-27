const { PrismaClient } = require('./prisma/generated-client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const employee = await prisma.employee.findFirst({
        where: { firstName: 'Roby', lastName: 'Belon' },
        include: { schedule: true }
    });
    fs.writeFileSync('c:/Users/Rob/826/rob_sched.json', JSON.stringify(employee.schedule, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
