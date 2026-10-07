import { PrismaClient } from '@prisma/client';

// One shared Prisma client. In development Next.js reloads modules often,
// so we keep the client on globalThis to avoid opening a new connection each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}