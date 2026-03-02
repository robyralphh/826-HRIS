import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { name, description, permissions } = await request.json();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Update role
        const role = await prisma.role.update({
            where: { id },
            data: {
                name,
                description,
            },
        });

        // Update permissions (simple approach: delete and recreate)
        await prisma.rolePermission.deleteMany({
            where: { roleId: id },
        });

        await prisma.rolePermission.createMany({
            data: permissions.map((p: any) => ({
                module: p.module,
                canView: !!p.canView,
                canCreate: !!p.canCreate,
                canEdit: !!p.canEdit,
                canDelete: !!p.canDelete,
                roleId: id,
            })),
        });

        return NextResponse.json(role);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Check if role is in use
        const userCount = await prisma.user.count({
            where: { roleId: id },
        });

        if (userCount > 0) {
            return NextResponse.json({ error: 'Role is currently assigned to users' }, { status: 400 });
        }

        await prisma.rolePermission.deleteMany({ where: { roleId: id } });
        await prisma.role.delete({ where: { id } });

        return NextResponse.json({ message: 'Role deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
}
