import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: true,
            },
        });
        return NextResponse.json(roles);
    } catch (error: any) {
        console.error('API Error fetching roles:', error);
        return NextResponse.json({
            error: 'Failed to fetch roles',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, description, isManager, parentRoleId, gracePeriodMinutes, permissions } = await request.json();

        let role = await prisma.role.create({
            data: {
                name,
                description,
                parentRoleId: parentRoleId || null,
                isManager: !!isManager,
                gracePeriodMinutes: parseInt(gracePeriodMinutes as string, 10) || 0
            },
        });

        if (permissions && permissions.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissions.map((p: any) => ({
                    module: p.module,
                    canView: !!p.canView,
                    canCreate: !!p.canCreate,
                    canEdit: !!p.canEdit,
                    canDelete: !!p.canDelete,
                    roleId: role.id,
                })),
            });

            // Re-fetch role to include permissions
            role = await prisma.role.findUnique({
                where: { id: role.id },
                include: { permissions: true }
            }) as any;
        }

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_ROLE', `Created new role "${role.name}"`);

        return NextResponse.json(role);
    } catch (error: any) {
        console.error('API Error creating role:', error);
        return NextResponse.json({
            error: 'Failed to create role',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
