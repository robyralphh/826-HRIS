import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');

        let query: any = {
            include: {
                employee: {
                    select: { firstName: true, lastName: true, department: { select: { name: true } }, position: { select: { name: true } } }
                },
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
            }
        };

        if (employeeId) {
            query.where = { employeeId };
        }

        const schedules = await prisma.schedule.findMany(query);
        return NextResponse.json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { employeeId, mondayId, tuesdayId, wednesdayId, thursdayId, fridayId, saturdayId, sundayId } = body;

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // Upsert because each employee only has one core schedule
        const schedule = await prisma.schedule.upsert({
            where: { employeeId },
            update: {
                mondayId: mondayId || null,
                tuesdayId: tuesdayId || null,
                wednesdayId: wednesdayId || null,
                thursdayId: thursdayId || null,
                fridayId: fridayId || null,
                saturdayId: saturdayId || null,
                sundayId: sundayId || null,
            },
            create: {
                employeeId,
                mondayId: mondayId || null,
                tuesdayId: tuesdayId || null,
                wednesdayId: wednesdayId || null,
                thursdayId: thursdayId || null,
                fridayId: fridayId || null,
                saturdayId: saturdayId || null,
                sundayId: sundayId || null,
            },
            include: {
                monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true
            }
        });

        return NextResponse.json(schedule, { status: 200 });
    } catch (error: any) {
        console.error('Error creating/updating schedule:', error);
        return NextResponse.json({ error: 'Failed to manage schedule' }, { status: 500 });
    }
}
