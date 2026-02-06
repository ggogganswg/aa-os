// src/core/identity/identityVersion.service.ts
/**
 * Purpose
 * - Append-only storage for identity model versions (CIM/FIM).
 *
 * Governance intent
 * - No interpretation. No ranking. No “insight.”
 * - Versions are immutable once written.
 * - Version numbering is deterministic per (modelSetId, type).
 *
 * Design constraints
 * - Creates a new row for each write.
 * - Enforces ownership (user must own the ModelSet).
 * - Does not modify ModelSet status yet (later ticket).
 */

import {
  PrismaClient,
  IdentityModelType,
  IdentityModelVersion,
  AuditEventType,
} from "@prisma/client";

type AuditSink = (evt: {
  userId: string;
  eventType: AuditEventType;
  timestamp: string;
  modelSetId?: string;
  type?: IdentityModelType;
  versionId?: string;
  versionNumber?: number;
  reason?: string;
}) => Promise<void>;

export function makeIdentityVersionService(opts: { prisma: PrismaClient; audit?: AuditSink }) {
  const prisma = opts.prisma;

  const audit: AuditSink =
    opts.audit ??
    (async (evt) => {
      await prisma.auditEvent.create({
        data: {
          userId: evt.userId,
          eventType: evt.eventType,
          meta: {
            modelSetId: evt.modelSetId ?? null,
            type: evt.type ?? null,
            versionId: evt.versionId ?? null,
            versionNumber: evt.versionNumber ?? null,
            reason: evt.reason ?? null,
            timestamp: evt.timestamp,
          },
        },
      });
    });

  async function emit(evt: Omit<Parameters<typeof audit>[0], "timestamp">) {
    await audit({ ...evt, timestamp: new Date().toISOString() });
  }

  async function block(userId: string, reason: string, extra?: Partial<Parameters<typeof audit>[0]>) {
    await emit({
      userId,
      eventType: AuditEventType.MUTATION_BLOCKED,
      reason,
      ...extra,
    });
    throw new Error(reason);
  }

  /**
   * Create a new identity version (append-only).
   * - Computes next version number per (modelSetId, type)
   * - Enforces user ownership of the ModelSet
   */
  async function createVersion(opts: {
    userId: string;
    modelSetId: string;
    type: IdentityModelType;
    payload: unknown;
  }): Promise<IdentityModelVersion> {
    const modelSet = await prisma.modelSet.findUnique({ where: { id: opts.modelSetId } });
    if (!modelSet) {
      await block(opts.userId, "ModelSet not found; cannot create identity version.", {
        modelSetId: opts.modelSetId,
        type: opts.type,
      });
      throw new Error("Unreachable");
    }

    if (modelSet.userId !== opts.userId) {
      await block(opts.userId, "ModelSet does not belong to user; cannot create identity version.", {
        modelSetId: opts.modelSetId,
        type: opts.type,
      });
    }

    const last = await prisma.identityModelVersion.findFirst({
      where: { modelSetId: opts.modelSetId, type: opts.type },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (last?.version ?? 0) + 1;

    const created = await prisma.identityModelVersion.create({
      data: {
        userId: opts.userId,
        modelSetId: opts.modelSetId,
        type: opts.type,
        version: nextVersion,
        payload: opts.payload as any,
      },
    });

    await emit({
      userId: opts.userId,
      eventType: AuditEventType.IDENTITY_VERSION_CREATED,
      modelSetId: opts.modelSetId,
      type: opts.type,
      versionId: created.id,
      versionNumber: created.version,
    });

    return created;
  }

  /**
   * Read latest version for (modelSetId, type)
   */
  async function getLatestVersion(opts: {
    userId: string;
    modelSetId: string;
    type: IdentityModelType;
  }): Promise<IdentityModelVersion | null> {
    const modelSet = await prisma.modelSet.findUnique({ where: { id: opts.modelSetId } });
    if (!modelSet) return null;
    if (modelSet.userId !== opts.userId) return null;

    return prisma.identityModelVersion.findFirst({
      where: { modelSetId: opts.modelSetId, type: opts.type },
      orderBy: { version: "desc" },
    });
  }

  return {
    createVersion,
    getLatestVersion,
  };
}
