import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { status } = await request.json();
        // Await params specifically if using Next.js 15, but project looks like Next.js 14
        const { id } = await params;
        const expenseId = id;

        if (!['Approved', 'Rejected', 'Paid', 'Pending'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updatedExpense = await prisma.expenseRequest.update({
            where: { id: expenseId },
            data: { status },
            include: { employee: true }
        });

        const adminId = request.headers.get('x-admin-id');
        const employeeName = updatedExpense.employee ? 
            `${updatedExpense.employee.firstName} ${updatedExpense.employee.lastName}` : 
            'Unknown Employee';

        await logAdminAction(
            adminId, 
            'UPDATE_EXPENSE_STATUS', 
            `Updated expense ID ${expenseId} status to ${status} for employee ${employeeName}`
        );

        return NextResponse.json(updatedExpense);
    } catch (error: any) {
        console.error('Finance Expense Update Error Details:', {
            error: error.message,
            stack: error.stack,
            params: params,
            id: params?.id
        });
        return NextResponse.json({ 
            error: 'Failed to update expense', 
            details: error.message 
        }, { status: 500 });
    }
}
