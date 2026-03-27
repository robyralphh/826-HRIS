import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const settings = await prisma.payrollSetting.findMany();
        return NextResponse.json(settings);
    } catch (error: any) {
        console.error('Error fetching payroll settings:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, percentage, startTime, endTime, isActive } = body;

        if (!name) {
            return NextResponse.json({ error: 'Setting name is required' }, { status: 400 });
        }

        const setting = await prisma.payrollSetting.upsert({
            where: { name },
            update: {
                percentage: parseFloat(percentage) || 10,
                startTime: startTime || "22:00",
                endTime: endTime || "06:00",
                isActive: isActive !== undefined ? isActive : true
            },
            create: {
                name,
                percentage: parseFloat(percentage) || 10,
                startTime: startTime || "22:00",
                endTime: endTime || "06:00",
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json(setting);
    } catch (error: any) {
        console.error('Error saving payroll setting:', error);
        return NextResponse.json({ error: 'Failed to save payroll setting' }, { status: 500 });
    }
}
