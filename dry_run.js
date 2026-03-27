const { PrismaClient } = require('./prisma/generated-client');
const prisma = new PrismaClient();

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
function toPhDateStr(d) {
    return new Date(d.getTime() + PH_OFFSET_MS).toISOString().split('T')[0];
}

function toPhWeekday(d) {
    const phDate = new Date(d.getTime() + PH_OFFSET_MS);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[phDate.getUTCDay()];
}

async function main() {
    const employee = await prisma.employee.findFirst({
        where: { firstName: 'Roby', lastName: 'Belon' },
        include: { schedule: true } // ADDED INCLUDE
    });

    const startDate = new Date('2026-03-05T16:00:00.000Z'); // Mar 6
    const endDate = new Date('2026-03-20T15:59:59.000Z');   // Mar 20

    const attendances = await prisma.attendance.findMany({
        where: { employeeId: employee.id }
    });
    
    // Filter manually
    const periodAtts = attendances.filter(a => a.date >= startDate && a.date <= endDate);

    console.log("Found attendances:", periodAtts.map(a => `${toPhDateStr(a.date)} ${a.status}`));

    let totalScheduledDays = 0;
    let totalAbsentDays = 0;

    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dayStr = toPhDateStr(current);
        const dayOfWeek = toPhWeekday(current);
        const shift = employee.schedule ? employee.schedule[dayOfWeek] : null;

        if (shift && shift.startTime && shift.endTime) {
            totalScheduledDays++;
            
            const dayAttendance = periodAtts.find(a => toPhDateStr(a.date) === dayStr);

            if (!dayAttendance || dayAttendance.status === 'Absent') {
                totalAbsentDays += 1;
                console.log(`[${dayStr}] ABSENT`);
            } else if (dayAttendance.timeIn && dayAttendance.timeOut) {
                console.log(`[${dayStr}] PRESENT`);
            } else if (dayAttendance) {
                totalAbsentDays += 1;
                console.log(`[${dayStr}] INCOMPLETE (missing timeIn or timeOut) -> counted as absent`);
            }
        } else {
            // console.log(`[${dayStr}] NO SHIFT scheduled (${dayOfWeek})`);
        }
        current.setDate(current.getDate() + 1);
    }

    console.log(`Scheduled: ${totalScheduledDays}, Absent: ${totalAbsentDays}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
