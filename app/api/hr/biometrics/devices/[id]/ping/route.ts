import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ZKService } from '@/lib/zkteco';

export async function GET(
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

        const zk = new ZKService(device.ip, device.port);
        const isOnline = await zk.connect();
        
        if (isOnline) {
            await zk.disconnect();
        }

        const newStatus = isOnline ? 'Active' : 'Offline';

        // Update database with the new status
        await prisma.biometricDevice.update({
            where: { id },
            data: { 
                status: newStatus,
                // We don't update lastSync here because we didn't pull any logs
            }
        });

        return NextResponse.json({ 
            success: true, 
            status: newStatus,
            message: isOnline ? 'Connection successful' : 'Device is unreachable'
        });
    } catch (error: any) {
        console.error('API Error pinging biometric device:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Ping failed' 
        }, { status: 500 });
    }
}
