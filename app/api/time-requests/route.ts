import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let employeeId = searchParams.get('employeeId');
        const adminId = request.headers.get('x-admin-id');

        let where: any = {};
        let overrideIsAdmin = false;

        // If a specific adminId is provided (meaning the request comes from the UI with a logged-in user)
        if (adminId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: adminId }
            });

            if (currentUser) {
                const userRole = await prisma.role.findUnique({
                    where: { id: currentUser.roleId },
                    include: { childRoles: true }
                }) as any;

                const roleName = userRole?.name || '';
                const isSuperAdmin = roleName === 'Super Admin';
                const isHR = roleName.includes('HR') || roleName.includes('Human Resources');

                if (isSuperAdmin || isHR) {
                    // Global access
                    overrideIsAdmin = true;
                    if (employeeId) {
                        where.employeeId = employeeId;
                    }
                } else if (userRole?.isManager) {
                    // Manager access: can see their own child roles + their own personal requests
                    const childRoleIds = userRole.childRoles.map((cr: any) => cr.id);
                    
                    // Create an OR string to find users with these roles
                    const childUsers = await prisma.user.findMany({
                        where: { roleId: { in: childRoleIds } },
                        select: { email: true }
                    });
                    const childEmails = childUsers.map(u => u.email);

                    // Also include the manager's own employee record if it exists
                    const managerEmails = [currentUser.email, ...childEmails];

                    const allowedEmployees = await prisma.employee.findMany({
                        where: { email: { in: managerEmails } },
                        select: { id: true }
                    });
                    const allowedEmployeeIds = allowedEmployees.map(e => e.id);

                    if (employeeId) {
                        if (allowedEmployeeIds.includes(employeeId)) {
                            where.employeeId = employeeId;
                        } else {
                            // Requesting a specific employee they don't have access to
                            return NextResponse.json([]);
                        }
                    } else {
                        where.employeeId = { in: allowedEmployeeIds };
                    }
                } else {
                    // Standard Employee: can only see themselves
                    const myEmployee = await prisma.employee.findUnique({
                        where: { email: currentUser.email }
                    });
                    
                    if (myEmployee) {
                        where.employeeId = myEmployee.id;
                    } else {
                        // User exists but has no linked Employee profile
                        return NextResponse.json([]);
                    }
                }
            }
        } else if (employeeId) {
            // Fallback for requests without x-admin-id but specifying employeeId directly
            where.employeeId = employeeId;
        }

        const requests = await prisma.timeRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        position: { select: { name: true } },
                        department: { select: { name: true } },
                        pictureUrl: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Include userRole context by looking up User accounts using Employee email
        const emails: string[] = [...new Set(requests.map((r: any) => r.employee.email as string))];
        const users = await prisma.user.findMany({
            where: { email: { in: emails } },
            include: { role: true }
        });
        const userMap = users.reduce((acc: any, u) => { acc[u.email] = u; return acc; }, {});

        const mappedRequests = requests.map((r: any) => ({
            ...r,
            employee: {
                ...r.employee,
                userRole: userMap[r.employee.email]?.role || null
            }
        }));

        return NextResponse.json(mappedRequests);
    } catch (error: any) {
        console.error('API Error fetching time requests:', error);
        return NextResponse.json({ error: 'Failed to fetch time requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Basic validation
        if (!data.employeeId || !data.type || !data.date || !data.startTime || !data.endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newRequest = await prisma.timeRequest.create({
            data: {
                employeeId: data.employeeId,
                type: data.type,
                date: new Date(data.date),
                startTime: data.startTime,
                endTime: data.endTime,
                reason: data.reason || null,
                status: 'Pending'
            }
        });
        
        const adminId = request.headers.get('x-admin-id');
        const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
        await logAdminAction(adminId, 'CREATE_TIME_REQUEST', `Created ${data.type} request for "${emp?.firstName} ${emp?.lastName}"`);

        return NextResponse.json(newRequest, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating time request:', error);
        return NextResponse.json({ error: 'Failed to create time request' }, { status: 500 });
    }
}
