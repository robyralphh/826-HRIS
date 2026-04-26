import { startOfDay, endOfDay } from 'date-fns';

/**
 * PH Time Helpers
 */
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

function toPhWeekday(d: Date): string {
    const phDate = new Date(d.getTime() + PH_OFFSET_MS);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[phDate.getUTCDay()];
}

/**
 * Resolves the effective shift for an employee on a given date.
 * 1. Checks ScheduleOverride collection first.
 * 2. Falls back to MasterSchedule.
 */
export async function getEffectiveShift(
    prisma: any, 
    employeeId: string, 
    date: Date
) {
    const targetDate = startOfDay(new Date(date.getTime() + PH_OFFSET_MS));

    // 1. Check for specific date override (ScheduleOverride)
    const override = await prisma.scheduleOverride.findFirst({
        where: {
            employeeId,
            date: {
                gte: targetDate,
                lte: endOfDay(targetDate)
            }
        }
    });

    if (override) {
        if (override.isRestDay) return null;
        return {
            startTime: override.startTime,
            endTime: override.endTime,
            isFlexi: false,
            flexiHours: null
        };
    }

    // 2. Fallback to Master Schedule (MasterSchedule)
    const schedule = await prisma.masterSchedule.findUnique({
        where: { employeeId },
        include: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true
        }
    });

    if (!schedule) return null;

    const weekday = toPhWeekday(date);
    const shift = (schedule as any)[weekday];

    if (!shift || !shift.startTime) return null;

    return {
        startTime: shift.startTime,
        endTime: shift.endTime,
        isFlexi: Boolean(shift.isFlexi),
        flexiHours: shift.flexiHours
    };
}
