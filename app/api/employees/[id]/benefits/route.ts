import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const employeeId = resolvedParams.id;

        const benefits = await prisma.employeeBenefit.findMany({
            where: { employeeId },
            include: { benefitPlan: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(benefits);
    } catch (error: any) {
        console.error('Error fetching employee benefits:', error);
        return NextResponse.json({ error: 'Failed to fetch employee benefits' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const employeeId = resolvedParams.id;
        const { benefitPlanId, status } = await request.json();

        if (!benefitPlanId) {
            return NextResponse.json({ error: 'Benefit Plan ID is required' }, { status: 400 });
        }

        const employeeBenefit = await prisma.employeeBenefit.upsert({
            where: {
                employeeId_benefitPlanId: {
                    employeeId,
                    benefitPlanId
                }
            },
            update: {
                status: status || 'Active'
            },
            create: {
                employeeId,
                benefitPlanId,
                status: status || 'Active'
            },
            include: { benefitPlan: true }
        });

        return NextResponse.json(employeeBenefit, { status: 201 });
    } catch (error: any) {
        console.error('Error assigning benefit:', error);
        return NextResponse.json({ error: 'Failed to assign benefit' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const employeeId = resolvedParams.id;

        // Use URL search params to get the specific benefit mapping ID or the plan ID
        const url = new URL(request.url);
        const employeeBenefitId = url.searchParams.get('employeeBenefitId');

        if (!employeeBenefitId) {
            return NextResponse.json({ error: 'employeeBenefitId is required to delete' }, { status: 400 });
        }

        await prisma.employeeBenefit.delete({
            where: { id: employeeBenefitId }
        });

        return NextResponse.json({ message: 'Benefit successfully unassigned' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Benefit assignment not found' }, { status: 404 });
        }
        console.error('Error unassigning benefit:', error);
        return NextResponse.json({ error: 'Failed to unassign benefit' }, { status: 500 });
    }
}
