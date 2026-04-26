import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET(request: Request) {
    try {
        const adminId = request.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify the user has HR module permissions or is a Super Admin
        const user = await prisma.user.findUnique({
            where: { id: adminId },
            include: { 
                role: {
                    include: { permissions: true }
                } 
            }
        });

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const isSuperAdmin = user.role?.name === 'Super Admin';
        const hasAttendancePerm = user.role?.permissions?.some(p => 
            (p.module === 'Daily Time Record (HR)' || p.module === 'Daily Attendance') && p.canView
        );

        if (!isSuperAdmin && !hasAttendancePerm) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all attendance logs, including the relevant employee details
        const attendanceLogs = await prisma.attendance.findMany({
            orderBy: { date: 'desc' },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        pictureUrl: true,
                        baseSalary: true,
                        salaryType: true,
                        workFactor: true,
                        employeeNo: true,
                        biometricId: true,
                        position: { select: { name: true } },
                        department: { select: { name: true } },
                        masterSchedule: {
                            include: {
                                monday:    true,
                                tuesday:   true,
                                wednesday: true,
                                thursday:  true,
                                friday:    true,
                                saturday:  true,
                                sunday:    true,
                            }
                        }
                    }
                }
            }
        });

        const emails: string[] = [...new Set(attendanceLogs.map((log: any) => log.employee.email as string))];
        const users = await prisma.user.findMany({
            where: { email: { in: emails } },
            include: { role: true }
        });
        const userMap = users.reduce((acc: any, u) => { acc[u.email] = u; return acc; }, {});

        const mappedLogs = attendanceLogs.map((log: any) => ({
            ...log,
            employee: {
                ...log.employee,
                gracePeriodMinutes: userMap[log.employee.email]?.role?.gracePeriodMinutes || 0
            }
        }));

        return NextResponse.json(mappedLogs);
    } catch (error) {
        console.error('Error fetching HR attendance logs:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }
}
