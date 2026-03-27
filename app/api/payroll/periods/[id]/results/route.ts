import { NextResponse } from 'next/server';
import { PrismaClient } from '@/prisma/generated-client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: periodId } = await params;

    try {
        const records = await prisma.payrollRecord.findMany({
            where: { payrollPeriodId: periodId },
            include: {
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        id: true,
                        department: { select: { name: true } },
                        position: { select: { name: true } }
                    }
                }
            }
        });
        return NextResponse.json(records);
    } catch (error) {
        console.error('Error fetching payroll results:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll results' }, { status: 500 });
    }
}
