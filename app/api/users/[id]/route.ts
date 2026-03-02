import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ message: 'User deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
