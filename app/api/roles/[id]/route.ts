import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { name, description, isManager, parentRoleId, gracePeriodMinutes, permissions } = await request.json();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Update role
        const role = await prisma.role.update({
            where: { id },
            data: {
                name,
                description,
                isManager: !!isManager,
                parentRoleId: parentRoleId || null,
                gracePeriodMinutes: parseInt(gracePeriodMinutes as string, 10) || 0
            },
        });

        // Update permissions only if provided
        if (permissions && Array.isArray(permissions)) {
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
        }
        
        const adminId = request.headers.get('x-admin-id');
        if (adminId) {
            await logAdminAction(adminId, 'UPDATE_ROLE', `Updated role "${role.name}"`);
        }

        return NextResponse.json(role);
    } catch (error: any) {
        console.error('Role Update Error:', error);
        return NextResponse.json({ error: 'Failed to update role', details: error.message }, { status: 500 });
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

        const roleToDel = await prisma.role.findUnique({ where: { id } });
        await prisma.rolePermission.deleteMany({ where: { roleId: id } });
        await prisma.role.delete({ where: { id } });

        const adminId = request.headers.get('x-admin-id');
        if (roleToDel) await logAdminAction(adminId, 'DELETE_ROLE', `Deleted role "${roleToDel.name}"`);

        return NextResponse.json({ message: 'Role deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
}
