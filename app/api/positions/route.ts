import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const departmentId = searchParams.get('departmentId');

        let query: any = {
            orderBy: { name: 'asc' },
            include: {
                department: true,
                _count: {
                    select: { employees: true }
                },
                employees: {
                    select: { id: true, firstName: true, lastName: true, department: { select: { name: true } } }
                }
            }
        };

        if (departmentId) {
            query.where = { departmentId };
        }

        const positions = await prisma.position.findMany(query);
        return NextResponse.json(positions);
    } catch (error) {
        console.error('Error fetching positions:', error);
        return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, status, departmentId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Position name is required' }, { status: 400 });
        }

        const position = await prisma.position.create({
            data: {
                name,
                description,
                status: status || 'active',
                departmentId: departmentId || null
            },
            include: {
                department: true
            }
        });

        return NextResponse.json(position, { status: 201 });
    } catch (error: any) {
        console.error('Error creating position:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'This position already exists in the selected department' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
    }
}
