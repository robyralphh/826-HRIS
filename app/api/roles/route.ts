import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        const { name, description, permissions } = await request.json();

        let role = await prisma.role.create({
            data: {
                name,
                description,
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

        return NextResponse.json(role);
    } catch (error: any) {
        console.error('API Error creating role:', error);
        return NextResponse.json({
            error: 'Failed to create role',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
