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
                        pictureUrl: true,
                        baseSalary: true,
                        salaryType: true,
                        workFactor: true,
                        position: { select: { name: true } },
                        department: { select: { name: true } },
                        schedule: {
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

        return NextResponse.json(attendanceLogs);
    } catch (error) {
        console.error('Error fetching HR attendance logs:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
    }
}
