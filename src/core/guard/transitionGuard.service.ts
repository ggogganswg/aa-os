// src/core/guard/transitionGuard.service.ts
/**
 * Purpose
 * - Central guardrails for system transitions.
 *
 * Governance intent
 * - One place to block dangerous/invalid actions.
 * - No “smart” behavior here: only structural prerequisites and safety overrides.
 *
 * Design constraints
 * - Paused state overrides all transitions.
 * - No Insight Delivery unless models exist.
 * - No interpretation during ASSESSING.
 * - Guard functions are pure checks + explicit errors (audited by caller).
 */

import { PrismaClient, SystemState } from "@prisma/client";

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string };

export function makeTransitionGuardService(opts: { prisma: PrismaClient }) {
  const prisma = opts.prisma;

  async function isUserPaused(userId: string): Promise<boolean> {
    const latest = await prisma.controlFlag.findFirst({
      where: { scope: "user", scopeId: userId },
      orderBy: { createdAt: "desc" },
      select: { paused: true },
    });

    return latest?.paused === true;
  }

  async function hasActiveModelSet(userId: string): Promise<boolean> {
    const ctx = await prisma.userContext.findUnique({
      where: { userId },
      select: { activeModelSetId: true },
    });

    return !!ctx?.activeModelSetId;
  }

  async function hasAnyIdentityVersions(modelSetId: string): Promise<boolean> {
    const count = await prisma.identityModelVersion.count({
      where: { modelSetId },
    });
    return count > 0;
  }

  /**
   * Guard: can the system enter INSIGHT_DELIVERY?
   * Requirements:
   * - User is not paused
   * - UserContext exists and has activeModelSetId
   * - Active ModelSet contains at least one identity version (CIM or FIM)
   */
  async function canEnterInsightDelivery(userId: string): Promise<GuardResult> {
    if (await isUserPaused(userId)) {
      return { ok: false, reason: "User is paused; cannot enter INSIGHT_DELIVERY." };
    }

    const ctx = await prisma.userContext.findUnique({
      where: { userId },
      select: { activeModelSetId: true },
    });

    if (!ctx) return { ok: false, reason: "UserContext missing; cannot enter INSIGHT_DELIVERY." };
    if (!ctx.activeModelSetId) {
      return { ok: false, reason: "No active ModelSet; cannot enter INSIGHT_DELIVERY." };
    }

    const hasVersions = await hasAnyIdentityVersions(ctx.activeModelSetId);
    if (!hasVersions) {
      return { ok: false, reason: "Active ModelSet has no identity versions; cannot enter INSIGHT_DELIVERY." };
    }

    return { ok: true };
  }

  /**
   * Guard: interpretation is blocked during ASSESSING.
   * Callers should use this before any interpretive step.
   */
  function canInterpret(currentState: SystemState): GuardResult {
    if (currentState === SystemState.ASSESSING) {
      return { ok: false, reason: "Interpretation is blocked during ASSESSING." };
    }
    return { ok: true };
  }

  /**
   * Guard: PAUSED overrides all transitions.
   * Caller should check this before performing any state transition or session advance.
   */
  async function canTransition(userId: string, _from: SystemState, to: SystemState): Promise<GuardResult> {
    if (await isUserPaused(userId)) {
      // Allow transition into PAUSED (idempotent), block all others
      if (to === SystemState.PAUSED) return { ok: true };
      return { ok: false, reason: "User is paused; transitions are blocked." };
    }
    return { ok: true };
  }

  return {
    canEnterInsightDelivery,
    canInterpret,
    canTransition,
  };
}
