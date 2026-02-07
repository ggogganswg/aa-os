// src/db-read/types.ts

/**
 * Read-only database surface exposed to projections.
 * This file defines the *capability boundary* for reads.
 *
 * IMPORTANT:
 * - Only include models that projections are allowed to read.
 * - Only include read methods (findUnique/findFirst/findMany/count/aggregate/groupBy).
 * - Do not include create/update/delete/upsert/executeRaw/transaction.
 *
 * We intentionally type these methods as generic call signatures to avoid
 * coupling this contract to a specific Prisma version's generated types.
 */

export type ReadMethods = {
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  count: (args?: any) => Promise<number>;
  aggregate?: (args: any) => Promise<any>;
  groupBy?: (args: any) => Promise<any>;
};

/**
 * DbReadContext is the only database capability that projections receive.
 * It is a strict subset of Prisma model delegates with only read operations.
 */
export interface DbReadContext {
  user: ReadMethods;
  session: ReadMethods;
  userContext: ReadMethods;
  modelSet: ReadMethods;
  identityModelVersion: ReadMethods;
  confidenceState: ReadMethods;
  pressureState: ReadMethods;
  controlFlag: ReadMethods;
  auditEvent: ReadMethods;
}
