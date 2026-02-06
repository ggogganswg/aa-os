/**
 * Prisma Client Initialization (AA-OS)
 *
 * Purpose:
 * - Provide a single, shared PrismaClient instance for the server runtime.
 * - Ensure compatibility with Prisma v7+ which requires an explicit adapter or Accelerate URL.
 *
 * Architectural constraints (DO NOT VIOLATE):
 * - AA-OS must run database access ONLY on the server (Node.js runtime).
 * - This module MUST NOT be imported into client-side code.
 * - This module MUST remain deterministic and side-effect minimal:
 *   it should only initialize the DB client (no queries, no migrations).
 *
 * Why the adapter is required:
 * - Prisma v7 removed the legacy engine path for many setups.
 * - "engine type: client" requires an adapter (free) or accelerateUrl (Prisma Accelerate).
 * - We use the Postgres adapter to keep the stack free and deployable.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Global Prisma singleton
 *
 * In dev, Next.js may hot-reload modules and re-import this file multiple times.
 * Re-creating Prisma clients repeatedly can exhaust connections.
 *
 * This pattern caches the client on `globalThis` in non-production environments.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Connection string source of truth
 *
 * AA-OS uses a standard DATABASE_URL (Postgres URI), typically provided via:
 * - local `.env` for development
 * - Vercel Environment Variables for production
 *
 * NOTE:
 * - Passwords must be URL-encoded if they contain special characters (e.g., `$` -> `%24`).
 * - Supabase often requires SSL; include `?sslmode=require` in the URL.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Hard fail early: without a DB connection, the system cannot operate safely.
  throw new Error("DATABASE_URL is not set. Prisma cannot initialize.");
}

/**
 * Prisma Postgres Adapter
 *
 * We use the adapter-pg adapter to allow Prisma Client to connect directly to Postgres
 * without Prisma Accelerate. This keeps the architecture simple and cost-controlled.
 */
const adapter = new PrismaPg({ connectionString });

/**
 * Exported Prisma client
 *
 * - In production: create a new client per server process.
 * - In development: reuse the global cached client to avoid connection storms.
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    // Keep logs light; expand only when debugging.
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
