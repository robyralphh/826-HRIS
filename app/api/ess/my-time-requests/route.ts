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

        const requests = await prisma.timeRequest.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            employee,
            requests
        });
    } catch (error: any) {
        console.error('API Error fetching my time requests:', error);
        return NextResponse.json({ error: 'Failed to fetch personal time requests' }, { status: 500 });
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

        if (!data.type || !data.date || !data.startTime || !data.endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newRequest = await prisma.timeRequest.create({
            data: {
                employeeId: employee.id,
                type: data.type,
                date: new Date(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                reason: data.reason || null,
                status: 'Pending'
            }
        });
        
        await logAdminAction(userId!, 'ESS_CREATE_TIME_REQUEST', `Employee "${employee.firstName} ${employee.lastName}" submitted a ${data.type} request via ESS`);

        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: any) {
        console.error('API Error submitting personal time request:', error);
        return NextResponse.json({ error: 'Failed to submit time request' }, { status: 500 });
    }
}
