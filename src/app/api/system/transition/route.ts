/**
 * SYSTEM STATE TRANSITION ROUTE (AA-OS)
 *
 * Responsibility:
 * - Enforce valid system state transitions for a given session.
 * - Apply hard governance constraints (e.g., pause locks, no insight without models).
 * - Persist state updates to the Session record.
 * - Emit audit events for both successful transitions and blocked attempts.
 *
 * This route MUST NOT:
 * - Advance state while the user/system is paused (except to PAUSED if you later support it).
 * - Jump directly to action-oriented states without prerequisite artifacts (e.g., no INSIGHT_DELIVERY without models).
 * - Become an "optimizer" route that issues directives or prescriptive actions.
 *
 * Notes:
 * - We currently treat "system state" as session-scoped (Session.state).
 *   If we later add an app-wide SystemStatus table, this route will remain the enforcement point.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SystemState } from "@prisma/client";
import { assertTransitionAllowed } from "@/lib/systemState";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // --- Parse & validate request payload ---
    const body = await req.json();
    const { userId, sessionId, from, to } = body as {
      userId: string;
      sessionId: string;
      from: SystemState;
      to: SystemState;
    };

    if (!userId || !sessionId || !from || !to) {
      return NextResponse.json(
        { error: "Missing userId, sessionId, from, or to." },
        { status: 400 }
      );
    }

    /**
     * --- Pause safety gate ---
     *
     * AA-OS uses pause as a hard governance lock:
     * - When paused, we block transitions to protect psychological safety and prevent overwhelm.
     * - We also log blocked attempts to preserve an auditable trail of system behavior.
     *
     * NOTE:
     * - We treat the latest ControlFlag row as the effective pause state.
     * - We DO NOT delete flags; we append new flags to preserve history.
     */
    const latestControl = await prisma.controlFlag.findFirst({
      where: { scope: "user", scopeId: userId },
      orderBy: { updatedAt: "desc" },
    });

    const isPaused = latestControl?.paused ?? false;


    // In the future, "hasModels" will reflect CIM/FIM existence. For now it's a placeholder.
    const ctx = {
      isPaused,
      hasModels: false,
    };

    /**
     * If paused, block transitions (governance constraint).
     * We return 403 to clearly indicate "forbidden by safety policy" (not a validation mistake).
     */
    if (ctx.isPaused) {
      await prisma.auditEvent.create({
        data: {
          userId,
          sessionId,
          eventType: "ACTION_BLOCKED_PAUSED",
          meta: { action: "SYSTEM_TRANSITION", attemptedTo: to },
        },
      });

      return NextResponse.json(
        { error: "System is paused; transition blocked." },
        { status: 403 }
      );
    }

    /**
     * --- State transition validation ---
     *
     * This is the single source of truth for allowed transitions.
     * It also enforces prerequisite constraints (e.g., no INSIGHT_DELIVERY without models).
     *
     * DO NOT bypass this by writing directly to Session.state.
     */
    assertTransitionAllowed(from, to, ctx);

    // --- Apply the state transition to the session ---
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { state: to },
    });

    // --- Audit the successful transition (required for traceability) ---
    await prisma.auditEvent.create({
      data: {
        userId,
        sessionId,
        eventType: "SYSTEM_STATE_TRANSITION",
        meta: { from, to },
      },
    });

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    /**
     * Error handling philosophy:
     * - Return a clear message to the caller for debugging/integration.
     * - Do not leak secrets or raw stack traces.
     */
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
