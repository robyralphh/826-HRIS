import { PrismaClient } from '../prisma/generated-client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Force a new instance if we're debugging or just updated
export const prisma = new PrismaClient({
    log: ['query'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
