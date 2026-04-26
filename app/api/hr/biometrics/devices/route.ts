import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const devices = await prisma.biometricDevice.findMany({
            include: { branch: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(devices);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const { name, branchId, ip, port } = requestData;

        if (!name || !branchId || !ip) {
            return NextResponse.json({ error: 'Name, Branch, and IP are required' }, { status: 400 });
        }

        const device = await prisma.biometricDevice.create({
            data: {
                name,
                branchId,
                ip,
                port: port ? parseInt(port) : 4370,
                status: 'Active'
            },
            include: { branch: true }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_BIOMETRIC_DEVICE', `Added biometric device: ${name} to branch ID: ${branchId}`);

        return NextResponse.json(device, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating biometric device:', error);
        return NextResponse.json({ error: 'Failed to create device' }, { status: 500 });
    }
}
