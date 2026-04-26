import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const expenses = await prisma.expenseRequest.findMany({
            include: {
                employee: true
            },
            orderBy: {
                date: 'desc'
            }
        });
        return NextResponse.json(expenses);
    } catch (error: any) {
        console.error('API Error fetching expenses:', error);
        return NextResponse.json({
            error: 'Failed to fetch expenses',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const { employeeId, amount, category, description, receiptUrls, status, date } = requestData;
        const urls = Array.isArray(receiptUrls) ? receiptUrls : [];

        if (!employeeId || !amount || !category) {
            return NextResponse.json({ error: 'Employee, Amount, and Category are required' }, { status: 400 });
        }

        const expense = await prisma.expenseRequest.create({
            data: {
                employeeId,
                amount: parseFloat(amount),
                category,
                description: description || '',
                receiptUrls: urls,
                status: status || 'Pending',
                date: date ? new Date(date) : new Date(),
            },
            include: {
                employee: true
            }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_EXPENSE', `Created expense request for employee ID: ${employeeId} - Amount: ${amount}`);

        return NextResponse.json(expense, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating expense:', error);
        return NextResponse.json({
            error: 'Failed to create expense',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
