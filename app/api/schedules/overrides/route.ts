import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

/**
 * GET /api/schedules/overrides?employeeId=...&startDate=...&endDate=...
 * Fetches date-specific schedule overrides.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let where: any = {};
        if (employeeId) {
            where.employeeId = employeeId;
        }
        
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                where.date.gte = s;
            }
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                where.date.lte = e;
            }
        }

        const overrides = await prisma.scheduleOverride.findMany({
            where,
            include: {
                employee: {
                    select: { 
                        firstName: true, 
                        lastName: true, 
                        employeeNo: true,
                        department: { select: { name: true } }
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        return NextResponse.json(overrides);
    } catch (error) {
        console.error('Error fetching schedule overrides:', error);
        return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 });
    }
}

/**
 * POST /api/schedules/overrides
 * Upserts a date-specific schedule override.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { employeeId, date, startTime, endTime, isRestDay, reason } = body;

        if (!employeeId || !date) {
            return NextResponse.json({ error: 'Employee ID and Date are required' }, { status: 400 });
        }

        // Normalize date to midnight (UTC or local depending on app convention, 
        // but consistently with how payroll reads it).
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        const override = await prisma.scheduleOverride.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: d
                }
            },
            update: {
                startTime: isRestDay ? null : startTime,
                endTime: isRestDay ? null : endTime,
                isRestDay,
                reason
            },
            create: {
                employeeId,
                date: d,
                startTime: isRestDay ? null : startTime,
                endTime: isRestDay ? null : endTime,
                isRestDay,
                reason
            }
        });

        const adminId = request.headers.get('x-admin-id');
        const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
        await logAdminAction(
            adminId, 
            'MANAGE_SCHEDULE_OVERRIDE', 
            `Set ${isRestDay ? 'Rest Day' : 'Shift Override'} for ${emp?.firstName} ${emp?.lastName} on ${d.toLocaleDateString()}`
        );

        return NextResponse.json(override);
    } catch (error: any) {
        console.error('Error managing schedule override:', error);
        return NextResponse.json({ 
            error: 'Failed to manage override', 
            details: error.message 
        }, { status: 500 });
    }
}

/**
 * DELETE /api/schedules/overrides?id=...
 * Removes a schedule override by ID.
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Override ID is required' }, { status: 400 });
        }

        const deleted = await prisma.scheduleOverride.delete({
            where: { id }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'DELETE_SCHEDULE_OVERRIDE', `Removed override for employee ID ${deleted.employeeId} on ${deleted.date.toLocaleDateString()}`);

        return NextResponse.json({ success: true, deleted });
    } catch (error) {
        console.error('Error deleting schedule override:', error);
        return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 });
    }
}
