import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/prisma/generated-client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const holidays = await prisma.holiday.findMany({
            orderBy: { date: 'asc' }
        });
        return NextResponse.json(holidays);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, date, type, multiplier } = body;

        const holiday = await prisma.holiday.create({
            data: {
                name,
                date: new Date(date),
                type,
                multiplier: parseFloat(multiplier)
            }
        });

        return NextResponse.json(holiday);
    } catch (error) {
        console.error('Error creating holiday:', error);
        return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
    }
}
