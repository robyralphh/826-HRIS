import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const device = await prisma.biometricDevice.findUnique({
            where: { id }
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        await prisma.biometricDevice.delete({
            where: { id }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'DELETE_BIOMETRIC_DEVICE', `Removed biometric device: ${device.name} (${device.ip})`);

        return NextResponse.json({ message: 'Device removed successfully' });
    } catch (error) {
        console.error('API Error deleting biometric device:', error);
        return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
    }
}
