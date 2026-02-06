// src/core/pressure/pressureState.service.ts
/**
 * Purpose
 * - Track Developmental Pressure Index (DPI) over time.
 *
 * Governance intent
 * - Pressure is descriptive, not diagnostic.
 * - DPI does not imply failure, weakness, or risk.
 * - Used later as a gating signal, not an output.
 *
 * Design constraints
 * - Append-only writes.
 * - DPI bounded 0–100.
 * - Pressure level derived deterministically.
 */

import { PrismaClient, PressureLevel, PressureState } from "@prisma/client";

type AuditSink = (evt: {
  userId: string;
  action: string;
  timestamp: string;
  dpi?: number;
  level?: PressureLevel;
  reason?: string;
  sessionId?: string;
}) => Promise<void>;

export function makePressureStateService(opts: {
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
          sessionId: evt.sessionId ?? null,
          eventType: evt.action,
          meta: {
            dpi: evt.dpi ?? null,
            level: evt.level ?? null,
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
      action: "PRESSURE_MUTATION_BLOCKED",
      reason,
    });
    throw new Error(reason);
  }

  function deriveLevel(dpi: number): PressureLevel {
    if (dpi < 0 || dpi > 100) {
      throw new Error("DPI must be between 0 and 100.");
    }

    if (dpi < 25) return PressureLevel.LOW;
    if (dpi < 50) return PressureLevel.MODERATE;
    if (dpi < 75) return PressureLevel.HIGH;
    return PressureLevel.CRITICAL;
  }

  /**
   * Record a new pressure state (append-only).
   */
  async function recordPressure(opts: {
    userId: string;
    dpi: number;
    reason?: string;
    sessionId?: string;
  }): Promise<PressureState> {
    if (opts.dpi < 0 || opts.dpi > 100) {
      await block(opts.userId, "DPI must be between 0 and 100.");
    }

    const level = deriveLevel(opts.dpi);

    const created = await prisma.pressureState.create({
      data: {
        userId: opts.userId,
        dpi: opts.dpi,
        level,
        reason: opts.reason ?? null,
        sessionId: opts.sessionId ?? null,
      },
    });

    await emit({
      userId: opts.userId,
      action: "PRESSURE_RECORDED",
      dpi: opts.dpi,
      level,
      reason: opts.reason,
      sessionId: opts.sessionId,
    });

    return created;
  }

  /**
   * Read latest pressure state (for gating later).
   */
  async function getLatestPressure(userId: string): Promise<PressureState | null> {
    return prisma.pressureState.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  return {
    recordPressure,
    getLatestPressure,
  };
}
