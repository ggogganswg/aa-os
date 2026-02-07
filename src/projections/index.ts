// src/projections/index.ts

import { PrismaClient } from "@prisma/client";

import { createDbReadContext } from "./db-read/prismaReadClient";
import { ProjectionRegistry } from "./contracts/ProjectionRegistry";
import { ProjectionExecutor } from "./contracts/ProjectionExecutor";
import { projectionDefinitions } from "./defs";
import { ProjectionGuardService } from "./guard/ProjectionGuardService";
import { ProjectionAuditEmitter } from "./index.types";

import {
  prisma as corePrisma,
  projectionAuditService as coreProjectionAuditService,
} from "../core/services";
import { ProjectionAuditService } from "../core/audit/ProjectionAudit.service";
import { ProjectionContext } from "./contracts/ProjectionContext";

/**
 * createProjectionExecutor(...)
 *
 * Composition root for the projection framework.
 *
 * HARD RULES:
 * - Projections receive read-only DB access via db-read capability surface.
 * - Projections do not receive write capabilities.
 * - Projection access is always auditable (executor enforces).
 *
 * NOTE:
 * By default, this uses the core Prisma singleton and core ProjectionAuditService.
 * If prismaOverride is provided, audit writes must use that same Prisma instance.
 */
export function createProjectionExecutor(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? corePrisma;

  const dbRead = createDbReadContext(prisma);

  const registry = new ProjectionRegistry(projectionDefinitions);
  const guard = new ProjectionGuardService();

  // Ensure audit writes use the same Prisma instance as the read context.
  const auditService =
    prismaOverride
      ? new ProjectionAuditService(prisma)
      : coreProjectionAuditService;

  const emitAuditEvent: ProjectionAuditEmitter = async (event) => {
    await auditService.recordProjectionAccess(event);
  };

  const ctxFactory = async (): Promise<ProjectionContext> => {
    return {
      db: dbRead,
      now: () => new Date(),
      audit: emitAuditEvent,
    };
  };

  return new ProjectionExecutor(registry, guard, ctxFactory);
}
