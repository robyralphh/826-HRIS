import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

// Helper to get the employee ID from the user ID
async function getEmployeeIdFromUser(userId: string | null) {
    if (!userId) return null;
    
    // Find the associated user
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
    });

    if (!user) return null;

    // Find the associated employee by matching email
    const employee = await prisma.employee.findUnique({
        where: { email: user.email },
        select: { id: true, firstName: true, lastName: true }
    });

    return employee;
}

export async function GET(request: Request) {
    try {
        const userId = request.headers.get('x-admin-id');
        const employee = await getEmployeeIdFromUser(userId);

        if (!employee) {
            return NextResponse.json({ error: 'Employee profile not found for this user.' }, { status: 404 });
        }

        const requests = await prisma.leaveRequest.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            employee,
            requests
        });
    } catch (error: any) {
        console.error('API Error fetching my leave requests:', error);
        return NextResponse.json({ error: 'Failed to fetch personal leave requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = request.headers.get('x-admin-id');
        const employee = await getEmployeeIdFromUser(userId);

        if (!employee) {
            return NextResponse.json({ error: 'Employee profile not found for this user.' }, { status: 404 });
        }

        const data = await request.json();

        if (!data.type || !data.startDate || !data.endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newRequest = await prisma.leaveRequest.create({
            data: {
                employeeId: employee.id,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                reason: data.reason || null,
                status: 'Pending'
            }
        });
        
        await logAdminAction(userId!, 'ESS_CREATE_LEAVE_REQUEST', `Employee "${employee.firstName} ${employee.lastName}" submitted a ${data.type} request from ${data.startDate} to ${data.endDate}`);

        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: any) {
        console.error('API Error submitting personal leave request:', error);
        return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
    }
}
