import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const loans = await prisma.companyLoan.findMany({
            include: {
                employee: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(loans);
    } catch (error: any) {
        console.error('API Error fetching loans:', error);
        return NextResponse.json({
            error: 'Failed to fetch loans',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const { employeeId, principalAmount, remainingBalance, monthlyDeduction, status } = requestData;

        if (!employeeId || principalAmount === undefined) {
            return NextResponse.json({ error: 'Employee and Principal Amount are required' }, { status: 400 });
        }

        const loan = await prisma.companyLoan.create({
            data: {
                employeeId,
                principalAmount: parseFloat(principalAmount),
                remainingBalance: remainingBalance !== undefined ? parseFloat(remainingBalance) : parseFloat(principalAmount),
                monthlyDeduction: monthlyDeduction !== undefined ? parseFloat(monthlyDeduction) : 0,
                status: status || 'Active',
            },
            include: {
                employee: true
            }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_LOAN', `Created loan for employee ID: ${employeeId} - Amount: ${principalAmount}`);

        return NextResponse.json(loan, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating loan:', error);
        return NextResponse.json({
            error: 'Failed to create loan',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
