import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [userCount, branchCount] = await Promise.all([
            prisma.user.count(),
            prisma.branch.count(),
        ]);

        return NextResponse.json({
            userCount,
            branchCount,
        });
    } catch (error: any) {
        console.error('API Error fetching dashboard stats:', error);
        return NextResponse.json({
            error: 'Failed to fetch dashboard stats',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
