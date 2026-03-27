import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await request.json();
        const { name, description, status } = body;

        const department = await prisma.department.update({
            where: { id },
            data: {
                name,
                description,
                status
            }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'UPDATE_DEPARTMENT', `Updated department "${department.name}"`);

        return NextResponse.json(department);
    } catch (error: any) {
        console.error('Error updating department:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A department with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Check if employees or positions are assigned to this department
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { employees: true, positions: true }
                }
            }
        });

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        if (department._count.employees > 0 || department._count.positions > 0) {
            return NextResponse.json({
                error: 'Cannot delete department. There are employees or positions assigned to it. Please reassign them first.'
            }, { status: 400 });
        }

        const deptToDel = await prisma.department.findUnique({ where: { id } });

        await prisma.department.delete({ where: { id } });

        const adminId = request.headers.get('x-admin-id');
        if (deptToDel) await logAdminAction(adminId, 'DELETE_DEPARTMENT', `Deleted department "${deptToDel.name}"`);

        return NextResponse.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
    }
}
