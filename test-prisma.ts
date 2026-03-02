import { prisma } from './lib/prisma';

async function test() {
    try {
        const roles = await prisma.role.findMany();
        console.log('SUCCESS: Successfully fetched roles:', roles.length);
    } catch (error) {
        console.error('ERROR: Failed to fetch roles:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
