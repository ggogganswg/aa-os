// src/db-read/prismaReadClient.ts

import { PrismaClient } from "@prisma/client";
import { DbReadContext, ReadMethods } from "./types";

/**
 * Build a read-only database surface from a PrismaClient.
 *
 * Structural guarantee:
 * - Projections only receive the returned object.
 * - This object exposes only read methods.
 * - If a write method is not exposed, it cannot be called.
 */
function pickReadMethods(delegate: any): ReadMethods {
  return {
    findUnique: delegate.findUnique.bind(delegate),
    findFirst: delegate.findFirst.bind(delegate),
    findMany: delegate.findMany.bind(delegate),
    count: delegate.count.bind(delegate),
    aggregate: delegate.aggregate ? delegate.aggregate.bind(delegate) : undefined,
    groupBy: delegate.groupBy ? delegate.groupBy.bind(delegate) : undefined,
  };
}

export function createDbReadContext(prisma: PrismaClient): DbReadContext {
  return {
    user: pickReadMethods(prisma.user),
    session: pickReadMethods(prisma.session),
    userContext: pickReadMethods(prisma.userContext),
    modelSet: pickReadMethods(prisma.modelSet),
    identityModelVersion: pickReadMethods(prisma.identityModelVersion),
    confidenceState: pickReadMethods(prisma.confidenceState),
    pressureState: pickReadMethods(prisma.pressureState),
    controlFlag: pickReadMethods(prisma.controlFlag),
    auditEvent: pickReadMethods(prisma.auditEvent),
  };
}
