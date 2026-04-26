import { PrismaClient } from './prisma/generated-client';

async function test() {
    const prisma = new PrismaClient();
    console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
    await prisma.$disconnect();
}

test().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
