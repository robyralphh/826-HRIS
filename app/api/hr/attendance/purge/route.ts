import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function DELETE(request: Request) {
    try {
        const adminId = request.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Define a reasonable date range (e.g., 2024 to 2027)
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2027-12-31');

        // Delete records outside this range
        const deleteResult = await prisma.attendance.deleteMany({
            where: {
                OR: [
                    { date: { lt: startDate } },
                    { date: { gt: endDate } }
                ]
            }
        });

        await logAdminAction(
            adminId, 
            'PURGE_ATTENDANCE', 
            `Purged ${deleteResult.count} invalid/ghost attendance records outside the 2024-2027 range.`
        );

        return NextResponse.json({ 
            success: true, 
            count: deleteResult.count,
            message: `Successfully purged ${deleteResult.count} ghost records.` 
        });
    } catch (error: any) {
        console.error('API Error purging attendance:', error);
        return NextResponse.json({ error: 'Failed to purge records' }, { status: 500 });
    }
}
