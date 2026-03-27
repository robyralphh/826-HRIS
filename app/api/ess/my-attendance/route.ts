import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// Philippine Standard Time offset (UTC+8)
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Returns the PH-local date string 'YYYY-MM-DD' for a given Date */
function toPhDateStr(d: Date): string {
    return new Date(d.getTime() + PH_OFFSET_MS).toISOString().split('T')[0];
}

/** Returns the PH-local weekday name (lowercase), e.g. 'monday', for schedule lookup */
function toPhWeekday(d: Date): string {
    // Add offset then read UTC day (which is now PH local day)
    const phDate = new Date(d.getTime() + PH_OFFSET_MS);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[phDate.getUTCDay()];
}

export async function GET(request: Request) {
    try {
        const userId = request.headers.get('x-admin-id');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const employee = await prisma.employee.findUnique({
            where: { email: user.email }
        });

        if (!employee) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

        const attendanceLogs = await prisma.attendance.findMany({
            where: { employeeId: employee.id },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(attendanceLogs);
    } catch (error) {
        console.error('Error fetching attendance logs:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance logs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = request.headers.get('x-admin-id');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { type, overrideDate, overrideTime } = await request.json(); // type: "ClockIn" | "ClockOut" | "Absent"

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const employee = await prisma.employee.findUnique({
            where: { email: user.email }
        });

        if (!employee) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

        const now = new Date();

        // ---------------------------------------------------------------------------
        // Determine actionable date and time. When no override, use the PH local date
        // so that the day-of-week schedule lookup is always correct regardless of the
        // server's timezone.
        // ---------------------------------------------------------------------------
        let actionableDate: Date;
        let actionableTime: Date;

        if (overrideDate) {
            // Override path: explicit date is given (YYYY-MM-DD in PH local time)
            actionableDate = new Date(`${overrideDate}T00:00:00+08:00`);
            if (overrideTime) {
                actionableTime = new Date(`${overrideDate}T${overrideTime}:00+08:00`);
            } else if (type === 'ClockOut') {
                // Default to current real time but on the override date
                const hh = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' }).slice(0, 5);
                actionableTime = new Date(`${overrideDate}T${hh}:00+08:00`);
            } else {
                actionableTime = actionableDate;
            }
        } else {
            // Real-time path: derive the PH calendar date from the current UTC timestamp
            const phDateStr = toPhDateStr(now);
            actionableDate = new Date(`${phDateStr}T00:00:00+08:00`);
            actionableTime = now;
        }

        // Fetch employee schedule once (reused across all action types)
        const schedule = await prisma.schedule.findUnique({
            where: { employeeId: employee.id },
            include: {
                monday: true, tuesday: true, wednesday: true,
                thursday: true, friday: true, saturday: true, sunday: true
            }
        });

        /** Returns the shift assigned to the given date in PH local time */
        function getShiftForDate(date: Date) {
            if (!schedule) return null;
            const dayKey = toPhWeekday(date);
            return (schedule as any)[dayKey] ?? null;
        }

        // -------------------------------------------------------------------------
        // CLOCK IN
        // -------------------------------------------------------------------------
        if (type === 'ClockIn') {
            // Prevent duplicate clock-ins on the same PH calendar date
            const existingRecord = await prisma.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    date: {
                        gte: actionableDate,
                        lt: new Date(actionableDate.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (existingRecord) {
                return NextResponse.json({ error: 'Already clocked in for this date' }, { status: 400 });
            }

            const shiftForDay = getShiftForDate(actionableDate);

            let status = 'Present';
            if (!shiftForDay || !shiftForDay.startTime || shiftForDay.startTime === '00:00') {
                // No shift assigned, or it's a flexi shift stored with "00:00" sentinel — treat as rest day
                // unless isFlexi is explicitly true
                if (shiftForDay && shiftForDay.isFlexi) {
                    status = 'Present'; // Flexi: never late, always present
                } else {
                    status = 'Rest Day';
                }
            } else if (shiftForDay.isFlexi) {
                status = 'Present'; // Explicit flexi guard (belt-and-suspenders)
            } else {
                // Fixed shift: compare PH local clock-in time against the shift start time
                const phTimeStr = actionableTime
                    .toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' })
                    .slice(0, 5); // 'HH:mm'

                if (phTimeStr > shiftForDay.startTime) {
                    status = 'Late';
                }
            }

            const newRecord = await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: actionableDate,
                    timeIn: actionableTime,
                    status
                }
            });
            return NextResponse.json(newRecord, { status: 201 });
        }

        // -------------------------------------------------------------------------
        // CLOCK OUT
        // -------------------------------------------------------------------------
        if (type === 'ClockOut') {
            const activeRecord = await prisma.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    timeOut: { isSet: false }
                },
                orderBy: { timeIn: 'desc' }
            });

            if (!activeRecord) {
                return NextResponse.json({ error: 'No active clock-in found to clock out from' }, { status: 400 });
            }

            const updatedData: any = { timeOut: actionableTime };

            // Undertime check using PH-local time
            const shiftForDay = getShiftForDate(new Date(activeRecord.date));

            if (shiftForDay && shiftForDay.endTime && !shiftForDay.isFlexi) {
                const phClockOutStr = actionableTime
                    .toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' })
                    .slice(0, 5);

                if (phClockOutStr < shiftForDay.endTime) {
                    if (activeRecord.status === 'Present') {
                        updatedData.status = 'Undertime';
                    } else if (!activeRecord.status.includes('Undertime')) {
                        updatedData.status = `${activeRecord.status}, Undertime`;
                    }
                }
            }

            const updatedRecord = await prisma.attendance.update({
                where: { id: activeRecord.id },
                data: updatedData
            });
            return NextResponse.json(updatedRecord);
        }

        // -------------------------------------------------------------------------
        // ABSENT
        // -------------------------------------------------------------------------
        if (type === 'Absent') {
            const existingRecord = await prisma.attendance.findFirst({
                where: {
                    employeeId: employee.id,
                    date: {
                        gte: actionableDate,
                        lt: new Date(actionableDate.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (existingRecord) {
                return NextResponse.json({ error: 'Record already exists for this date' }, { status: 400 });
            }

            const shiftForDay = getShiftForDate(actionableDate);
            const status = (!shiftForDay || !shiftForDay.startTime) ? 'Day Off' : 'Absent';

            const newRecord = await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: actionableDate,
                    status
                }
            });
            return NextResponse.json(newRecord, { status: 201 });
        }

        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });

    } catch (error) {
        console.error('Error logging attendance:', error);
        return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
    }
}
