import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/prisma/generated-client';

const prisma = new PrismaClient();

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { name, date, type, multiplier } = body;

        const holiday = await prisma.holiday.update({
            where: { id: params.id },
            data: {
                name,
                date: new Date(date),
                type,
                multiplier: parseFloat(multiplier)
            }
        });

        return NextResponse.json(holiday);
    } catch (error) {
        console.error('Error updating holiday:', error);
        return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.holiday.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
    }
}
