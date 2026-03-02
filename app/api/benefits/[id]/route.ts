import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { name, type, description } = await request.json();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (description !== undefined) updateData.description = description || null;

        const plan = await prisma.benefitPlan.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(plan);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Benefit Plan not found' }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A benefit plan with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update benefit plan' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        await prisma.benefitPlan.delete({ where: { id } });
        return NextResponse.json({ message: 'Benefit Plan deleted successfully' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Benefit Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete benefit plan' }, { status: 500 });
    }
}
