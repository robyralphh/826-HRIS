import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const shifts = await prisma.shift.findMany({
            orderBy: { startTime: 'asc' }
        });
        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, startTime, endTime, workDays, status } = body;

        if (!name || !startTime || !endTime) {
            return NextResponse.json({ error: 'Name, Start Time, and End Time are required' }, { status: 400 });
        }

        const shift = await prisma.shift.create({
            data: {
                name,
                startTime,
                endTime,
                workDays: workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                status: status || 'active'
            }
        });

        return NextResponse.json(shift, { status: 201 });
    } catch (error: any) {
        console.error('Error creating shift:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A shift with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
    }
}
