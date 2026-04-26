import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function GET() {
    try {
        const assets = await prisma.companyAsset.findMany({
            include: {
                employee: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(assets);
    } catch (error: any) {
        console.error('API Error fetching assets:', error);
        return NextResponse.json({
            error: 'Failed to fetch assets',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const { employeeId, name, type, serialNumber, purchaseDate, purchasePrice, condition, status } = requestData;

        if (!name || !type) {
            return NextResponse.json({ error: 'Asset Name and Type are required' }, { status: 400 });
        }

        const asset = await prisma.companyAsset.create({
            data: {
                employeeId: employeeId || null,
                name,
                type,
                serialNumber: serialNumber || null,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : null,
                condition: condition || 'Good',
                status: status || 'Available',
            },
            include: {
                employee: true
            }
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'CREATE_ASSET', `Created company asset: ${name} (${type})`);

        return NextResponse.json(asset, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating asset:', error);
        // Handle unique constraint on serial number
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'An asset with this serial number already exists' }, { status: 409 });
        }
        return NextResponse.json({
            error: 'Failed to create asset',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
