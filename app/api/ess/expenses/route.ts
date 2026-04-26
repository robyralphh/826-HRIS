import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const userId = request.headers.get('x-admin-id');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const employee = await prisma.employee.findUnique({
            where: { email: user.email }
        });

        if (!employee) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

        const expenses = await prisma.expenseRequest.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(expenses);
    } catch (error: any) {
        console.error('ESS Expense Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = request.headers.get('x-admin-id');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const employee = await prisma.employee.findUnique({
            where: { email: user.email }
        });

        if (!employee) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

        const { amount, category, description, receiptUrls } = await request.json();
        const urls = Array.isArray(receiptUrls) ? receiptUrls : [];

        if (!amount || !category || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const expense = await prisma.expenseRequest.create({
            data: {
                employeeId: employee.id,
                amount: parseFloat(amount),
                category,
                description,
                receiptUrls: urls,
                status: 'Pending'
            }
        });

        return NextResponse.json(expense, { status: 201 });
    } catch (error: any) {
        console.error('ESS Expense Create Error:', error);
        return NextResponse.json({ error: 'Failed to submit expense request' }, { status: 500 });
    }
}
