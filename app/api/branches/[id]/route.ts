import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { name, location, status } = await request.json();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const branch = await prisma.branch.update({
            where: { id },
            data: {
                name,
                location,
                status,
            },
        });

        return NextResponse.json(branch);
    } catch (error: any) {
        console.error('API Error updating branch:', error);
        return NextResponse.json({
            error: 'Failed to update branch',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Check if branch has users
        const userCount = await prisma.user.count({
            where: { branchId: id },
        });

        if (userCount > 0) {
            return NextResponse.json({
                error: 'Cannot delete branch with associated users. Please reassign users first.'
            }, { status: 400 });
        }

        await prisma.branch.delete({ where: { id } });
        return NextResponse.json({ message: 'Branch deleted successfully' });
    } catch (error: any) {
        console.error('API Error deleting branch:', error);
        return NextResponse.json({
            error: 'Failed to delete branch',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
