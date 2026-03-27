const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.attendance.findMany({
        include: {
            employee: {
                include: {
                    schedule: {
                        include: {
                            monday: true, tuesday: true, wednesday: true,
                            thursday: true, friday: true, saturday: true, sunday: true
                        }
                    }
                }
            }
        }
    });
    
    const lateLogs = logs.filter(l => l.status.includes('Late'));
    fs.writeFileSync('out.json', JSON.stringify(lateLogs.map(l => ({
        id: l.id,
        date: l.date,
        timeIn: l.timeIn,
        status: l.status,
        employeeName: l.employee.firstName,
        schedule: l.employee.schedule
    })), null, 2));

}

main().finally(() => prisma.$disconnect());
