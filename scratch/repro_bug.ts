
import { PrismaClient } from '../prisma/generated-client/index.js';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('Testing employee creation...');
        const email = `test-${Date.now()}@example.com`;
        
        // This simulates what the API does
        const employee = await prisma.employee.create({
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: email,
                status: 'active',
                employeeNo: `TEST-${Date.now()}`,
                // Simulating the potentially problematic fields
                departmentId: null,
                positionId: null,
                branchId: null,
                baseSalary: 0,
                workFactor: 313,
            } as any
        });
        console.log('Employee created successfully:', employee.id);

        console.log('Testing schedule creation (upsert)...');
        const schedule = await prisma.masterSchedule.upsert({
            where: { employeeId: employee.id },
            update: {
                mondayId: null,
                tuesdayId: null,
                wednesdayId: null,
                thursdayId: null,
                fridayId: null,
                saturdayId: null,
                sundayId: null,
            },
            create: {
                employeeId: employee.id,
                mondayId: null,
                tuesdayId: null,
                wednesdayId: null,
                thursdayId: null,
                fridayId: null,
                saturdayId: null,
                sundayId: null,
            }
        });
        console.log('Schedule created/updated successfully:', schedule.id);

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
