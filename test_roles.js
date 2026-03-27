const { prisma } = require('./lib/prisma');

async function main() {
    try {
        const roles = await prisma.role.findMany({
            include: { permissions: true }
        });
        console.log("Success! Roles fetched:", roles.length);
    } catch (e) {
        console.error("PRISMA ERROR:", e);
    }
}

main().finally(() => prisma.$disconnect());
