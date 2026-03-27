import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                role: {
                    include: {
                        permissions: true
                    }
                },
                branch: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const requestData = await request.json();
        const { username, email, password, roleId } = requestData;
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const updateData: any = {
            email,
            username,
        };

        if (roleId) {
            updateData.roleId = roleId;
        }

        if (requestData.hasOwnProperty('branchId')) {
            updateData.branchId = requestData.branchId ? requestData.branchId : null;
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                role: true,
                branch: true,
            },
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'UPDATE_USER', `Updated user ${user.username} (${user.email})`);

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('API Error updating user:', error);
        return NextResponse.json({
            error: 'Failed to update user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const user = await prisma.user.delete({ where: { id } });
        
        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'DELETE_USER', `Deleted user ${user.username} (${user.email})`);
        
        return NextResponse.json({ message: 'User deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
