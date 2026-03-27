import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const data = await request.json();

        // Update the status or reason
        const updatedRequest = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: data.status,
                reason: data.reason
            },
            include: { employee: true }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'UPDATE_LEAVE_REQUEST_STATUS', `Updated leave request ${id} to status ${data.status} for ${updatedRequest.employee.firstName} ${updatedRequest.employee.lastName}`);

        return NextResponse.json(updatedRequest);
    } catch (error: any) {
        console.error('API Error updating leave request:', error);
        return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const targetRequest = await prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });

        await prisma.leaveRequest.delete({
            where: { id }
        });

        const adminId = request.headers.get('x-admin-id');
        if (targetRequest) {
            await logAdminAction(adminId, 'DELETE_LEAVE_REQUEST', `Deleted leave request ${id} for ${targetRequest.employee.firstName} ${targetRequest.employee.lastName}`);
        }

        return NextResponse.json({ message: 'Leave request deleted successfully' });
    } catch (error: any) {
        console.error('API Error deleting leave request:', error);
        return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 });
    }
}
