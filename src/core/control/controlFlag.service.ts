// src/core/control/controlFlag.service.ts
/**
 * Purpose
 * - Central pause/kill-switch logic for AA-OS.
 *
 * Governance intent
 * - A single, auditable control plane that can override all system behavior.
 * - Append-only flags; latest flag wins.
 *
 * Design constraints
 * - scope="system" uses scopeId=null
 * - scope="user" uses scopeId=userId
 * - No deletion; only append new flags
 */

import { PrismaClient, AuditEventType } from "@prisma/client";

type Scope = "system" | "user";

type AuditSink = (evt: {
  userId?: string | null;
  eventType: AuditEventType;
  timestamp: string;
  scope: Scope;
  scopeId?: string | null;
  paused: boolean;
  reason?: string;
}) => Promise<void>;

export function makeControlFlagService(opts: { prisma: PrismaClient; audit?: AuditSink }) {
  const prisma = opts.prisma;

  const audit: AuditSink =
    opts.audit ??
    (async (evt) => {
      await prisma.auditEvent.create({
        data: {
          userId: evt.userId ?? null,
          eventType: evt.eventType,
          meta: {
            scope: evt.scope,
            scopeId: evt.scopeId ?? null,
            paused: evt.paused,
            reason: evt.reason ?? null,
            timestamp: evt.timestamp,
          },
        },
      });
    });

  async function emit(evt: Omit<Parameters<typeof audit>[0], "timestamp">) {
    await audit({ ...evt, timestamp: new Date().toISOString() });
  }

  async function setFlag(opts: {
    scope: Scope;
    scopeId?: string | null;
    paused: boolean;
    reason?: string;
    auditUserId?: string | null; // optional: who initiated (if known)
  }) {
    const scopeId = opts.scope === "system" ? null : (opts.scopeId ?? null);

    const created = await prisma.controlFlag.create({
      data: {
        scope: opts.scope,
        scopeId,
        paused: opts.paused,
        reason: opts.reason ?? null,
      },
    });

    await emit({
      userId: opts.auditUserId ?? (opts.scope === "user" ? scopeId : null),
      eventType: opts.paused ? AuditEventType.SYSTEM_PAUSED : AuditEventType.SYSTEM_RESUMED,
      scope: opts.scope,
      scopeId,
      paused: opts.paused,
      reason: opts.reason,
    });

    return created;
  }

  async function getLatestFlag(scope: Scope, scopeId?: string | null) {
    const effectiveScopeId = scope === "system" ? null : (scopeId ?? null);

    return prisma.controlFlag.findFirst({
      where: { scope, scopeId: effectiveScopeId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Effective pause = system paused OR user paused.
   * - If system paused, all users are paused.
   * - If system not paused, user pause may still apply.
   */
  async function getEffectivePause(userId: string): Promise<{ isPaused: boolean; reason?: string }> {
    const system = await getLatestFlag("system");
    if (system?.paused) return { isPaused: true, reason: system.reason ?? "System is paused." };

    const user = await getLatestFlag("user", userId);
    if (user?.paused) return { isPaused: true, reason: user.reason ?? "User is paused." };

    return { isPaused: false };
  }

  return {
    setFlag,
    getLatestFlag,
    getEffectivePause,
  };
}
