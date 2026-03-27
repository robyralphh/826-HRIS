import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            include: {
                role: true,
                branch: true,
            },
        });
        return NextResponse.json(users);
    } catch (error: any) {
        console.error('API Error fetching users:', error);
        return NextResponse.json({
            error: 'Failed to fetch users',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const { email, username, password, roleId } = requestData;

        if (!roleId) {
            return NextResponse.json({ error: 'Valid Role is required' }, { status: 400 });
        }

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password, // In a real app, hash this
                roleId: roleId,
                branchId: requestData.branchId ? requestData.branchId : null,
            },
            include: {
                role: true,
                branch: true,
            },
        });

        // ---------------------------------------------------------------------------------
        // AUTO-LINK FEATURE: Create a placeholder Employee record linked by the same email
        // so the new User can immediately use the ESS (Time Off requests, etc.)
        // ---------------------------------------------------------------------------------
        const existingEmployee = await prisma.employee.findUnique({ where: { email } });
        if (!existingEmployee) {
            await prisma.employee.create({
                data: {
                    firstName: username?.split(' ')[0] || 'Unknown',
                    lastName: username?.split(' ').slice(1).join(' ') || 'User',
                    email: email,
                    status: 'active',
                    branchId: requestData.branchId ? requestData.branchId : null
                }
            });
        }

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_USER', `Created user ${user.username} (${user.email})`);

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('API Error creating user:', error);
        return NextResponse.json({
            error: 'Failed to create user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
