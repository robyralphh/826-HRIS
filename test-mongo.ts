import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testDatabase() {
    console.log('Testing CRUD operations and relations for MongoDB migration...');
    try {
        // --- 1. Branch CRUD ---
        console.log('\n--- branch ---');
        const branch = await prisma.branch.create({
            data: {
                name: 'Main HQ',
                location: 'Downtown',
                status: 'active'
            }
        });
        console.log('Created branch:', branch.id);

        let fetchedBranch = await prisma.branch.findUnique({ where: { id: branch.id } });
        console.log('Read branch:', fetchedBranch?.name);

        fetchedBranch = await prisma.branch.update({
            where: { id: branch.id },
            data: { location: 'Uptown' }
        });
        console.log('Updated branch location:', fetchedBranch?.location);


        // --- 2. Role CRUD ---
        console.log('\n--- role ---');
        const role = await prisma.role.create({
            data: {
                name: 'Test Admin Role',
                description: 'Super user',
                permissions: {
                    create: [
                        { module: 'User Settings', canView: true, canEdit: true, canCreate: true, canDelete: true }
                    ]
                }
            }
        });
        console.log('Created role:', role.id);

        let fetchedRole = await prisma.role.findUnique({ where: { id: role.id }, include: { permissions: true } });
        console.log('Read role:', fetchedRole?.name, 'Permissions count:', fetchedRole?.permissions.length);

        fetchedRole = await prisma.role.update({
            where: { id: role.id },
            data: { description: 'Updated Admin' },
            include: { permissions: true }
        });
        console.log('Updated role description:', fetchedRole?.description);


        // --- 3. User CRUD (with relations) ---
        console.log('\n--- user ---');
        const user = await prisma.user.create({
            data: {
                email: 'testadmin@example.com',
                username: 'admin1',
                password: 'password123',
                roleId: role.id,
                branchId: branch.id
            }
        });
        console.log('Created user:', user.id);

        let fetchedUser = await prisma.user.findUnique({ where: { id: user.id }, include: { role: true, branch: true } });
        console.log('Read user (relations check):', fetchedUser?.username, 'Role:', fetchedUser?.role.name, 'Branch:', fetchedUser?.branch?.name);

        fetchedUser = await prisma.user.update({
            where: { id: user.id },
            data: { username: 'superadmin1' },
            include: { role: true, branch: true }
        });
        console.log('Updated user:', fetchedUser?.username);


        // --- 4. Employee CRUD (with relations) ---
        console.log('\n--- employee ---');
        const employee = await prisma.employee.create({
            data: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'johndoe@example.com',
                department: 'IT',
                position: 'Developer',
                branchId: branch.id
            }
        });
        console.log('Created employee:', employee.id);

        let fetchedEmp = await prisma.employee.findUnique({ where: { id: employee.id }, include: { branch: true } });
        console.log('Read employee:', fetchedEmp?.firstName, fetchedEmp?.lastName, 'Branch:', fetchedEmp?.branch?.name);

        fetchedEmp = await prisma.employee.update({
            where: { id: employee.id },
            data: { position: 'Senior Developer' },
            include: { branch: true }
        });
        console.log('Updated employee position:', fetchedEmp?.position);


        // --- 5. Clean up (Deletes) ---
        console.log('\n--- cleaning up ---');
        await prisma.employee.delete({ where: { id: employee.id } });
        console.log('Deleted employee');

        await prisma.user.delete({ where: { id: user.id } });
        console.log('Deleted user');

        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        await prisma.role.delete({ where: { id: role.id } });
        console.log('Deleted role and permissions');

        await prisma.branch.delete({ where: { id: branch.id } });
        console.log('Deleted branch');

        console.log('\n✅ CRUD Tests passed successfully!');
    } catch (e) {
        console.error('\n❌ Test failed: ', e);
    }
}

testDatabase().finally(() => prisma.$disconnect());
