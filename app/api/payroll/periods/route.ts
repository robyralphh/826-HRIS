import { NextResponse } from 'next/server';
import { PrismaClient } from '@/prisma/generated-client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const periods = await prisma.payrollPeriod.findMany({
            orderBy: { startDate: 'desc' },
            include: {
                _count: {
                    select: { records: true }
                }
            }
        });
        return NextResponse.json(periods);
    } catch (error) {
        console.error('Error fetching periods:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll periods' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, startDate, endDate } = await req.json();
        
        const period = await prisma.payrollPeriod.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'Draft'
            }
        });
        
        return NextResponse.json(period);
    } catch (error) {
        console.error('Error creating period:', error);
        return NextResponse.json({ error: 'Failed to create payroll period' }, { status: 500 });
    }
}
