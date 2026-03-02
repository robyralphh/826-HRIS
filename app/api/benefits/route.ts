import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const benefitPlans = await prisma.benefitPlan.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(benefitPlans);
    } catch (error: any) {
        console.error('Error fetching benefit plans:', error);
        return NextResponse.json({ error: 'Failed to fetch benefit plans' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, type, description } = await request.json();

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });
        }

        const plan = await prisma.benefitPlan.create({
            data: {
                name,
                type,
                description: description || null
            }
        });

        return NextResponse.json(plan, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A benefit plan with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create benefit plan' }, { status: 500 });
    }
}
