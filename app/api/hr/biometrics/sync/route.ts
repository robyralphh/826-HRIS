import { NextResponse } from 'next/server';
import { BiometricsOrchestration } from '@/lib/biometrics-orchestrator';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const adminId = request.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { branchId, deviceId } = await request.json().catch(() => ({}));

        let fetchResults;

        if (deviceId) {
            fetchResults = [await BiometricsOrchestration.syncDevice(deviceId)];
        } else if (branchId) {
            fetchResults = await BiometricsOrchestration.syncBranch(branchId);
        } else {
            fetchResults = await BiometricsOrchestration.syncAll();
        }

        const processResults = await BiometricsOrchestration.processRawLogs();

        return NextResponse.json({ 
            message: 'Sync and processing completed',
            fetchResults,
            processResults
        });
    } catch (error: any) {
        console.error('Biometric Sync API Error:', error);
        return NextResponse.json({ 
            error: 'Failed to complete biometric sync',
            details: error.message 
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    // Return sync status/summary if needed
    try {
        const devices = await prisma.biometricDevice.findMany({
            include: { branch: true }
        });
        return NextResponse.json(devices);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch device status' }, { status: 500 });
    }
}
