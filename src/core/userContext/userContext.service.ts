// src/core/userContext/userContext.service.ts
/**
 * Purpose
 * - Provide minimal, resettable continuity for AA-OS without treating history as identity truth.
 *
 * Governance intent
 * - UserContext stores references only (no interpretation, no raw content, no derived traits).
 * - All mutations are explicit, audited, and guardrailed.
 *
 * Design constraints
 * - Reference-only persistence (string IDs); ownership + validity enforced in service layer.
 * - No implicit creation of ModelSets or Sessions.
 * - "lastClosedSessionId" must only ever point to a CLOSED session (per Session phase + closedAt).
 */

import { PrismaClient, SessionPhase, UserContext, AuditEventType } from "@prisma/client";

type AuditEventPayload = {
  userId: string;
  eventType: AuditEventType;
  timestamp: string;
  contextVersion?: number;
  reason?: string;
  sessionId?: string;
  modelSetId?: string;
};

type PauseCheck = (userId: string) => Promise<{ isPaused: boolean; reason?: string }>;
type AuditSink = (evt: AuditEventPayload) => Promise<void>;

function isSessionClosed(session: { phase: SessionPhase; closedAt: Date | null }) {
  return session.phase === SessionPhase.CLOSURE && session.closedAt !== null;
}

export function makeUserContextService(opts: {
  prisma: PrismaClient;
  isPaused?: PauseCheck;
  audit?: AuditSink;
}) {
  const prisma = opts.prisma;

  const isPaused: PauseCheck =
    opts.isPaused ??
    (async (userId: string) => {
      const latest = await prisma.controlFlag.findFirst({
        where: { scope: "user", scopeId: userId },
        orderBy: { createdAt: "desc" },
      });

      if (!latest) return { isPaused: false };
      if (!latest.paused) return { isPaused: false };
      return { isPaused: true, reason: latest.reason ?? "User is paused." };
    });

  const audit: AuditSink =
    opts.audit ??
    (async (evt) => {
      await prisma.auditEvent.create({
        data: {
          userId: evt.userId,
          sessionId: evt.sessionId ?? null,
          eventType: evt.eventType,
          meta: {
            contextVersion: evt.contextVersion ?? null,
            modelSetId: evt.modelSetId ?? null,
            reason: evt.reason ?? null,
            timestamp: evt.timestamp,
          },
        },
      });
    });

  async function emit(evt: Omit<AuditEventPayload, "timestamp">) {
    await audit({ ...evt, timestamp: new Date().toISOString() });
  }

  async function block(userId: string, reason: string, extra?: Partial<AuditEventPayload>) {
    await emit({
      userId,
      eventType: AuditEventType.MUTATION_BLOCKED,
      reason,
      ...extra,
    });
    throw new Error(reason);
  }

  async function ensureUserContext(userId: string): Promise<UserContext> {
    const existing = await prisma.userContext.findUnique({ where: { userId } });
    if (existing) return existing;

    const created = await prisma.userContext.create({
      data: { userId, contextVersion: 1 },
    });

    await emit({
      userId,
      eventType: AuditEventType.USER_CONTEXT_CREATED,
      contextVersion: created.contextVersion,
    });

    return created;
  }

  async function setLastClosedSession(userId: string, sessionId: string): Promise<UserContext> {
    const pause = await isPaused(userId);
    if (pause.isPaused) {
      await block(userId, pause.reason ?? "User is paused; cannot set lastClosedSessionId.", {
        sessionId,
      });
    }

    await ensureUserContext(userId);

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      await block(userId, "Session not found; cannot set lastClosedSessionId.", { sessionId });
      throw new Error("Unreachable");
    }

    if (session.userId !== userId) {
      await block(userId, "Session does not belong to user; cannot set lastClosedSessionId.", {
        sessionId,
      });
    }

    if (!isSessionClosed({ phase: session.phase, closedAt: session.closedAt })) {
      await block(userId, "Session is not CLOSED; cannot set lastClosedSessionId.", { sessionId });
    }

    const updated = await prisma.userContext.update({
      where: { userId },
      data: { lastClosedSessionId: sessionId },
    });

    await emit({
      userId,
      eventType: AuditEventType.USER_CONTEXT_LAST_SESSION_SET,
      sessionId,
      contextVersion: updated.contextVersion,
    });

    return updated;
  }

  async function activateModelSet(userId: string, modelSetId: string): Promise<UserContext> {
    const pause = await isPaused(userId);
    if (pause.isPaused) {
      await block(userId, pause.reason ?? "User is paused; cannot activate ModelSet.", {
        modelSetId,
      });
    }

    await ensureUserContext(userId);

    const modelSet = await prisma.modelSet.findUnique({ where: { id: modelSetId } });
    if (!modelSet) {
      await block(userId, "ModelSet not found; cannot activate ModelSet.", { modelSetId });
      throw new Error("Unreachable");
    }

    if (modelSet.userId !== userId) {
      await block(userId, "ModelSet does not belong to user; cannot activate ModelSet.", {
        modelSetId,
      });
    }

    const updated = await prisma.userContext.update({
      where: { userId },
      data: { activeModelSetId: modelSetId },
    });

    await emit({
      userId,
      eventType: AuditEventType.USER_CONTEXT_MODELSET_ACTIVATED,
      modelSetId,
      contextVersion: updated.contextVersion,
    });

    return updated;
  }

  async function clearActiveModelSet(userId: string): Promise<UserContext> {
    const pause = await isPaused(userId);
    if (pause.isPaused) {
      await block(userId, pause.reason ?? "User is paused; cannot clear active ModelSet.");
    }

    await ensureUserContext(userId);

    const updated = await prisma.userContext.update({
      where: { userId },
      data: { activeModelSetId: null },
    });

    await emit({
      userId,
      eventType: AuditEventType.USER_CONTEXT_MODELSET_CLEARED,
      contextVersion: updated.contextVersion,
    });

    return updated;
  }

  async function resetUserContext(userId: string): Promise<UserContext> {
    // Governance: allow reset even if paused.
    await ensureUserContext(userId);

    const updated = await prisma.userContext.update({
      where: { userId },
      data: {
        lastClosedSessionId: null,
        activeModelSetId: null,
        contextVersion: { increment: 1 },
      },
    });

    await emit({
      userId,
      eventType: AuditEventType.USER_CONTEXT_RESET,
      contextVersion: updated.contextVersion,
    });

    return updated;
  }

  return {
    ensureUserContext,
    setLastClosedSession,
    activateModelSet,
    clearActiveModelSet,
    resetUserContext,
  };
}
