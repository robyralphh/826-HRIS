import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        const where = employeeId ? { employeeId } : {};

        const requests = await prisma.timeRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        position: { select: { name: true } },
                        department: { select: { name: true } },
                        pictureUrl: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(requests);
    } catch (error: any) {
        console.error('API Error fetching time requests:', error);
        return NextResponse.json({ error: 'Failed to fetch time requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Basic validation
        if (!data.employeeId || !data.type || !data.date || !data.startTime || !data.endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newRequest = await prisma.timeRequest.create({
            data: {
                employeeId: data.employeeId,
                type: data.type,
                date: new Date(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                reason: data.reason || null,
                status: 'Pending'
            }
        });

        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating time request:', error);
        return NextResponse.json({ error: 'Failed to create time request' }, { status: 500 });
    }
}
