import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const adminId = request.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: adminId },
            include: { role: true }
        });

        if (!user || (user.role?.name !== 'Super Admin' && user.role?.name !== 'HR Manager')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { timeIn, timeOut, incidentReportUrl } = await request.json();

        // Validate payload
        if (!timeIn) {
            return NextResponse.json({ error: 'Time In is required to maintain a valid shift record.' }, { status: 400 });
        }
        if (!incidentReportUrl) {
            return NextResponse.json({ error: 'Incident Report attachment is required for manual edits.' }, { status: 400 });
        }

        const updateData: any = {
            timeIn: new Date(timeIn),
            incidentReportUrl: incidentReportUrl
        };

        if (timeOut) {
            updateData.timeOut = new Date(timeOut);
        } else {
             // If HR manually erases a timeOut, it opens the shift back up
            updateData.timeOut = null;
        }

        const updatedRecord = await prisma.attendance.update({
            where: { id },
            data: updateData,
            include: { employee: true }
        });

        // Audit Trail
        await prisma.actionLog.create({
            data: {
                userId: adminId,
                action: 'UPDATE_ATTENDANCE',
                description: `HR updated DTR record ${id} for Employee ${updatedRecord.employee.firstName} ${updatedRecord.employee.lastName}`,
            }
        });

        return NextResponse.json(updatedRecord);
    } catch (error) {
        console.error('Error updating attendance record:', error);
        return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 });
    }
}
