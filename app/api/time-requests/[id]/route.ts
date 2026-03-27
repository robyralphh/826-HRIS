import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();

        // We only expect updates to the 'status' or maybe 'reason' for now
        const updatedRequest = await prisma.timeRequest.update({
            where: { id },
            data: {
                status: data.status,
            }
        });

        const adminId = request.headers.get('x-admin-id');
        const emp = await prisma.employee.findUnique({ where: { id: updatedRequest.employeeId } });
        await logAdminAction(adminId, 'UPDATE_TIME_REQUEST_STATUS', `Updated ${updatedRequest.type} request status for "${emp?.firstName} ${emp?.lastName}" to ${data.status}`);

        return NextResponse.json(updatedRequest);
    } catch (error: any) {
        console.error('API Error updating time request:', error);
        return NextResponse.json({ error: 'Failed to update time request' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const timeReqToDel = await prisma.timeRequest.findUnique({ where: { id } });

        await prisma.timeRequest.delete({
            where: { id }
        });

        const adminId = request.headers.get('x-admin-id');
        if (timeReqToDel) {
            const emp = await prisma.employee.findUnique({ where: { id: timeReqToDel.employeeId } });
            await logAdminAction(adminId, 'DELETE_TIME_REQUEST', `Deleted ${timeReqToDel.type} request for "${emp?.firstName} ${emp?.lastName}"`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error deleting time request:', error);
        return NextResponse.json({ error: 'Failed to delete time request' }, { status: 500 });
    }
}
