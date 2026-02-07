// src/core/audit/ProjectionAudit.service.ts

import { PrismaClient, AuditEventType } from "@prisma/client";
import { ProjectionAccessAudit } from "../../projections/contracts/ProjectionContext";

/**
 * ProjectionAuditService
 *
 * Core audit service responsible for recording projection access.
 *
 * This is a PURE audit write:
 * - No inference
 * - No interpretation
 * - No transitions
 * - No side effects beyond persistence
 *
 * This service exists to support Epic 2 observation guarantees while
 * preserving all Epic 1 audit invariants.
 */
export class ProjectionAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * recordProjectionAccess(...)
   *
   * Writes a typed AuditEvent with eventType = PROJECTION_ACCESSED.
   */
  async recordProjectionAccess(event: ProjectionAccessAudit): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        userId: event.userId,
        sessionId: event.sessionId ?? null,
        eventType: AuditEventType.PROJECTION_ACCESSED,

        /**
         * meta is structural only.
         * No semantic meaning, no interpretation.
         */
        meta: {
          projection: event.projection,
          inputsHash: event.inputsHash,
          sources: event.sources,
          occurredAt: event.occurredAt.toISOString(),
        },
      },
    });
  }
}
