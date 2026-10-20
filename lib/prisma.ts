/**
 * Prisma Client singleton — ensures single instance across hot reloads in development.
 * In production, each request gets its own connection from the connection pool.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var prisma` — prevents multiple instances in dev hot-reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
