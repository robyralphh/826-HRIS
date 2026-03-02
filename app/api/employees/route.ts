import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                branch: true,
                department: true,
                position: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(employees);
    } catch (error: any) {
        console.error('API Error fetching employees:', error);
        return NextResponse.json({
            error: 'Failed to fetch employees',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const requestData = await request.json();
        const {
            firstName, lastName, email, phone, dateOfBirth, gender, address,
            department, position, dateHired, status,
            educationalDegree, educationalInstitution, yearGraduated,
            emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
            sssNumber, sssStatus, philHealthNumber, philHealthStatus,
            pagIbigNumber, pagIbigStatus, tinNumber,
            branchId, departmentId, positionId, pictureUrl
        } = requestData;

        // Basic validation
        if (!firstName || !lastName || !email) {
            return NextResponse.json({ error: 'First Name, Last Name, and Email are required' }, { status: 400 });
        }

        const employee = await prisma.employee.create({
            data: {
                firstName,
                lastName,
                email,
                phone: phone || null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                gender: gender || null,
                address: address || null,
                department: department || null,
                position: position || null,
                departmentId: departmentId || null,
                positionId: positionId || null,
                dateHired: dateHired ? new Date(dateHired) : null,
                status: status || 'active',
                pictureUrl: pictureUrl || null,
                educationalDegree: educationalDegree || null,
                educationalInstitution: educationalInstitution || null,
                yearGraduated: yearGraduated || null,
                emergencyContactName: emergencyContactName || null,
                emergencyContactPhone: emergencyContactPhone || null,
                emergencyContactRelationship: emergencyContactRelationship || null,
                sssNumber: sssNumber || null,
                sssStatus: sssStatus || 'Pending',
                philHealthNumber: philHealthNumber || null,
                philHealthStatus: philHealthStatus || 'Pending',
                pagIbigNumber: pagIbigNumber || null,
                pagIbigStatus: pagIbigStatus || 'Pending',
                tinNumber: tinNumber || null,
                branchId: branchId ? branchId : null,
            },
            include: {
                branch: true,
                department: true,
                position: true
            },
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
        console.error('API Error creating employee:', error);
        // Handle unique constraint violation (e.g. duplicate email)
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'An employee with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({
            error: 'Failed to create employee',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
