require('ts-node').register(); // Try to require ts-node to execute TS directly
const { prisma } = require('./lib/prisma.ts');

async function main() {
    console.log("Fetching schedule using @/lib/prisma...");
    const schedule = await prisma.schedule.findFirst({
        include: {
            monday: true
        }
    });
    
    if (schedule && schedule.monday) {
        console.log("Monday Shift:", schedule.monday.name);
        console.log("isFlexi explicitly defined in Monday?:", 'isFlexi' in schedule.monday);
        console.log("isFlexi value:", schedule.monday.isFlexi);
    } else {
        console.log("No schedule or monday shift found to test.");
    }
}

main().catch(e => {
    console.error(e);
}).finally(() => prisma.$disconnect());
