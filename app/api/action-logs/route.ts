import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const logs = await prisma.actionLog.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // Limit to recent 100 logs for performance, can add pagination later
        });
        
        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('API Error fetching action logs:', error);
        return NextResponse.json({
            error: 'Failed to fetch action logs',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
