import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const data = await request.json();

        // We only expect updates to the 'status' or maybe 'reason' for now
        const updatedRequest = await prisma.timeRequest.update({
            where: { id },
            data: {
                status: data.status,
            }
        });

        return NextResponse.json(updatedRequest);
    } catch (error: any) {
        console.error('API Error updating time request:', error);
        return NextResponse.json({ error: 'Failed to update time request' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        await prisma.timeRequest.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error deleting time request:', error);
        return NextResponse.json({ error: 'Failed to delete time request' }, { status: 500 });
    }
}
