import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await request.json();
        const { name, description, status, departmentId } = body;

        const position = await prisma.position.update({
            where: { id },
            data: {
                name,
                description,
                status,
                departmentId: departmentId || null
            },
            include: {
                department: true
            }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'UPDATE_POSITION', `Updated position "${position.name}" in department "${position.department?.name || 'Unassigned'}"`);

        return NextResponse.json(position);
    } catch (error: any) {
        console.error('Error updating position:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'This position already exists in the selected department' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update position' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Check if employees are assigned to this position
        const position = await prisma.position.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { employees: true }
                }
            }
        });

        if (!position) {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        }

        if (position._count.employees > 0) {
            return NextResponse.json({
                error: 'Cannot delete position. There are employees assigned to it. Please reassign them first.'
            }, { status: 400 });
        }

        const posToDel = await prisma.position.findUnique({ where: { id } });

        await prisma.position.delete({ where: { id } });

        const adminId = request.headers.get('x-admin-id');
        if (posToDel) await logAdminAction(adminId, 'DELETE_POSITION', `Deleted position "${posToDel.name}"`);

        return NextResponse.json({ message: 'Position deleted successfully' });
    } catch (error) {
        console.error('Error deleting position:', error);
        return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 });
    }
}
