const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching attendances for Roby Belon...");
    const employee = await prisma.employee.findFirst({
        where: { firstName: 'Roby', lastName: 'Belon' }
    });

    if (!employee) {
        console.log("Employee not found.");
        return;
    }

    const attendances = await prisma.attendance.findMany({
        where: {
            employeeId: employee.id,
            date: {
                gte: new Date('2026-03-06T00:00:00Z'),
                lte: new Date('2026-03-20T23:59:59Z')
            }
        }
    });

    console.log(`Found ${attendances.length} exactly between Mar 6 and Mar 20 (UTC).`);
    for (const a of attendances) {
        console.log(`- DB date: ${a.date.toISOString()} | timeIn: ${a.timeIn?.toISOString()}`);
    }

    // Now check without date filter just in case
    const all = await prisma.attendance.findMany({
        where: { employeeId: employee.id }
    });
    console.log(`\nTotal found without filter: ${all.length}`);
    for (const a of all) {
        console.log(`- DB date: ${a.date.toISOString()} | status: ${a.status}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
