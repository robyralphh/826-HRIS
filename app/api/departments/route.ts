import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { employees: true, positions: true }
                },
                employees: {
                    select: { id: true, firstName: true, lastName: true, position: { select: { name: true } } }
                }
            }
        });
        return NextResponse.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, status } = body;

        if (!name) {
            return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
        }

        const department = await prisma.department.create({
            data: {
                name,
                description,
                status: status || 'active'
            }
        });

        return NextResponse.json(department, { status: 201 });
    } catch (error: any) {
        console.error('Error creating department:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A department with this name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
    }
}
