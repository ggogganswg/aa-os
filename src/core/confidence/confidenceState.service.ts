// src/core/confidence/confidenceState.service.ts
/**
 * Purpose
 * - Write-only tracking of confidence levels across domains.
 *
 * Governance intent
 * - Confidence is descriptive, not evaluative.
 * - No scoring, ranking, or interpretation occurs here.
 * - Values are bounded and reasons are structural.
 *
 * Design constraints
 * - Append-only writes.
 * - Latest value is derived by timestamp, not mutation.
 * - Ownership enforced at write time.
 */

import { PrismaClient, ConfidenceDomain, ConfidenceState } from "@prisma/client";

type AuditSink = (evt: {
  userId: string;
  action: string;
  timestamp: string;
  domain?: ConfidenceDomain;
  key?: string;
  value?: number;
  reason?: string;
}) => Promise<void>;

export function makeConfidenceStateService(opts: {
  prisma: PrismaClient;
  audit?: AuditSink;
}) {
  const prisma = opts.prisma;

  const audit: AuditSink =
    opts.audit ??
    (async (evt) => {
      await prisma.auditEvent.create({
        data: {
          userId: evt.userId,
          eventType: evt.action,
          meta: {
            domain: evt.domain ?? null,
            key: evt.key ?? null,
            value: evt.value ?? null,
            reason: evt.reason ?? null,
            timestamp: evt.timestamp,
          },
        },
      });
    });

  async function emit(evt: Omit<Parameters<typeof audit>[0], "timestamp">) {
    await audit({ ...evt, timestamp: new Date().toISOString() });
  }

  async function block(userId: string, reason: string) {
    await emit({
      userId,
      action: "CONFIDENCE_MUTATION_BLOCKED",
      reason,
    });
    throw new Error(reason);
  }

  /**
   * Record a new confidence value (append-only).
   * Value must be between 0.0 and 1.0 inclusive.
   */
  async function recordConfidence(opts: {
    userId: string;
    domain: ConfidenceDomain;
    key: string;
    value: number;
    reason?: string;
    modelSetId?: string;
    sessionId?: string;
  }): Promise<ConfidenceState> {
    if (opts.value < 0 || opts.value > 1) {
      await block(opts.userId, "Confidence value must be between 0.0 and 1.0.");
    }

    const created = await prisma.confidenceState.create({
      data: {
        userId: opts.userId,
        domain: opts.domain,
        key: opts.key,
        value: opts.value,
        reason: opts.reason ?? null,
        modelSetId: opts.modelSetId ?? null,
        sessionId: opts.sessionId ?? null,
      },
    });

    await emit({
      userId: opts.userId,
      action: "CONFIDENCE_RECORDED",
      domain: opts.domain,
      key: opts.key,
      value: opts.value,
      reason: opts.reason,
    });

    return created;
  }

  /**
   * Read the latest confidence value for a given key.
   * (Used only as a gate, not interpretation.)
   */
  async function getLatestConfidence(opts: {
    userId: string;
    domain: ConfidenceDomain;
    key: string;
  }): Promise<ConfidenceState | null> {
    return prisma.confidenceState.findFirst({
      where: {
        userId: opts.userId,
        domain: opts.domain,
        key: opts.key,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return {
    recordConfidence,
    getLatestConfidence,
  };
}
