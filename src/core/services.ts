// src/core/services.ts
/**
 * Central service wiring (AA-OS)
 *
 * NOTE:
 * Prisma Client is running with Query Compiler enabled,
 * which requires a Driver Adapter.
 * For Node runtime (scripts + Next.js node routes), we use the Postgres adapter.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { makeUserContextService } from "./userContext/userContext.service";
import { makeIdentityVersionService } from "./identity/identityVersion.service";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function getPgPool() {
  if (globalForPrisma.pgPool) return globalForPrisma.pgPool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Prisma driver adapter requires DATABASE_URL at runtime."
    );
  }

  const pool = new Pool({ connectionString: url });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  return pool;
}

function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const adapter = new PrismaPg(getPgPool());
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

export const prisma = getPrisma();
export const userContextService = makeUserContextService({ prisma });
export const identityVersionService = makeIdentityVersionService({ prisma });

