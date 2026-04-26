import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/actionLog';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const requestData = await request.json();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        const {
            firstName, lastName, email, phone, dateOfBirth, gender, address,
            dateHired, status,
            educationalDegree, educationalInstitution, yearGraduated,
            emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
            sssNumber, sssStatus, philHealthNumber, philHealthStatus,
            pagIbigNumber, pagIbigStatus, tinNumber,
            branchId, departmentId, positionId, pictureUrl,
            salaryType, baseSalary, workFactor, biometricId, employeeNo
        } = requestData;

        // Build update object dynamically
        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone || null;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (gender !== undefined) updateData.gender = gender || null;
        if (address !== undefined) updateData.address = address || null;
        if (dateHired !== undefined) updateData.dateHired = dateHired ? new Date(dateHired) : null;
        if (status !== undefined) updateData.status = status;

        if (educationalDegree !== undefined) updateData.educationalDegree = educationalDegree || null;
        if (educationalInstitution !== undefined) updateData.educationalInstitution = educationalInstitution || null;
        if (yearGraduated !== undefined) updateData.yearGraduated = yearGraduated || null;

        if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName || null;
        if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone || null;
        if (emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = emergencyContactRelationship || null;

        if (sssNumber !== undefined) updateData.sssNumber = sssNumber || null;
        if (sssStatus !== undefined) updateData.sssStatus = sssStatus || 'Pending';
        if (philHealthNumber !== undefined) updateData.philHealthNumber = philHealthNumber || null;
        if (philHealthStatus !== undefined) updateData.philHealthStatus = philHealthStatus || 'Pending';
        if (pagIbigNumber !== undefined) updateData.pagIbigNumber = pagIbigNumber || null;
        if (pagIbigStatus !== undefined) updateData.pagIbigStatus = pagIbigStatus || 'Pending';
        if (tinNumber !== undefined) updateData.tinNumber = tinNumber || null;

        if (pictureUrl !== undefined) updateData.pictureUrl = pictureUrl || null;

        if (branchId !== undefined) {
            updateData.branchId = branchId ? branchId : null;
        }
        if (departmentId !== undefined) {
            updateData.departmentId = departmentId ? departmentId : null;
        }
        if (positionId !== undefined) {
            updateData.positionId = positionId ? positionId : null;
        }

        if (salaryType !== undefined) updateData.salaryType = salaryType || 'Monthly';
        if (baseSalary !== undefined) updateData.baseSalary = parseFloat(baseSalary) || 0;
        if (workFactor !== undefined) updateData.workFactor = workFactor === 261 ? 261 : 313;
        if (biometricId !== undefined) updateData.biometricId = biometricId || null;
        if (employeeNo !== undefined) updateData.employeeNo = employeeNo || null;

        const employee = await prisma.employee.update({
            where: { id },
            data: updateData,
            include: {
                branch: true,
                department: true,
                position: true
            },
        });

        const adminId = request.headers.get('x-admin-id');
        await logAdminAction(adminId, 'UPDATE_EMPLOYEE', `Updated employee "${employee.firstName} ${employee.lastName}"`);

        return NextResponse.json(employee);
    } catch (error: any) {
        console.error('API Error updating employee:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'An employee with this email already exists.' }, { status: 409 });
        }
        return NextResponse.json({
            error: 'Failed to update employee',
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

        const employeeToDelete = await prisma.employee.findUnique({ where: { id } });
        await prisma.employee.delete({ where: { id } });

        const adminId = request.headers.get('x-admin-id');
        if (employeeToDelete) await logAdminAction(adminId, 'DELETE_EMPLOYEE', `Deleted employee "${employeeToDelete.firstName} ${employeeToDelete.lastName}"`);

        return NextResponse.json({ message: 'Employee deleted successfully' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }
}
