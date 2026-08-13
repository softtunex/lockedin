import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Pooled connection (PgBouncer) — correct for request-time queries from
  // serverless functions, which open far more concurrent connections than a
  // long-running server would. Migrations use DIRECT_URL instead (see
  // prisma.config.ts) since PgBouncer's transaction pooling mode doesn't
  // support the session-level features `migrate deploy` needs.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
