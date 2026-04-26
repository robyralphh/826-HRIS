import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const ledgerEntries = await prisma.ledgerEntry.findMany({
            orderBy: {
                date: 'desc'
            }
        });
        
        // Calculate totals for dashboard summary
        const income = ledgerEntries
            .filter(e => e.type === 'INCOME')
            .reduce((sum, e) => sum + e.amount, 0);
        
        const expenses = ledgerEntries
            .filter(e => e.type === 'EXPENSE')
            .reduce((sum, e) => sum + e.amount, 0);

        return NextResponse.json({
            entries: ledgerEntries,
            summary: {
                totalIncome: income,
                totalExpenses: expenses,
                netBalance: income - expenses
            }
        });
    } catch (error: any) {
        console.error('API Error fetching ledger:', error);
        return NextResponse.json({
            error: 'Failed to fetch ledger entries',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const { date, type, category, amount, description, referenceId } = requestData;

        if (!type || !category || amount === undefined) {
            return NextResponse.json({ error: 'Type, Category, and Amount are required' }, { status: 400 });
        }

        const entry = await prisma.ledgerEntry.create({
            data: {
                date: date ? new Date(date) : new Date(),
                type,
                category,
                amount: parseFloat(amount),
                description: description || null,
                referenceId: referenceId || null,
            }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_LEDGER_ENTRY', `Created ledger entry: ${type} - ${category} - ${amount}`);

        return NextResponse.json(entry, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating ledger entry:', error);
        return NextResponse.json({
            error: 'Failed to create ledger entry',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
