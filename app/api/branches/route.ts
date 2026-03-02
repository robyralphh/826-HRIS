import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            include: {
                users: true,
            },
        });
        return NextResponse.json(branches);
    } catch (error: any) {
        console.error('API Error fetching branches:', error);
        return NextResponse.json({
            error: 'Failed to fetch branches',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, location, status } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                location,
                status: status || 'active',
            },
        });

        return NextResponse.json(branch);
    } catch (error: any) {
        console.error('API Error creating branch:', error);
        return NextResponse.json({
            error: 'Failed to create branch',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
