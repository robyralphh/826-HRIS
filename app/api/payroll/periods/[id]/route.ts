import { NextResponse } from 'next/server';
import { PrismaClient } from '@/prisma/generated-client';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        // Since PayrollRecord has onDelete: Cascade in schema.prisma,
        // deleting the period should automatically delete associated records.
        await prisma.payrollPeriod.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Payroll period and associated records deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting payroll period:', error);
        return NextResponse.json({ error: 'Failed to delete payroll period', details: error.message }, { status: 500 });
    }
}
