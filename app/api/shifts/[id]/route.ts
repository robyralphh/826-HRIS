import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await request.json();
        const { name, startTime, endTime, workDays, status } = body;

        const shift = await prisma.shift.update({
            where: { id },
            data: {
                name,
                startTime,
                endTime,
                workDays,
                status
            }
        });

        return NextResponse.json(shift);
    } catch (error: any) {
        console.error('Error updating shift:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        await prisma.shift.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Shift deleted successfully' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
    }
}
