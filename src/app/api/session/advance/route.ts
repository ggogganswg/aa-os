/**
 * SESSION PHASE ADVANCEMENT ROUTE (AA-OS)
 *
 * Responsibility:
 * - Enforce valid session phase transitions (OPENING → ENGAGEMENT → SYNTHESIS → CLOSURE).
 * - Prevent phase mutation when a user-level pause is active (governance lock).
 * - Ensure only the owning user can mutate the session.
 * - Emit audit events for both successful advances and blocked attempts.
 *
 * This route MUST NOT:
 * - Advance phases out of order.
 * - Advance a closed session.
 * - Mutate any session while paused.
 * - Become a "coaching directive" endpoint; it only manages session mechanics.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionPhase } from "@prisma/client";
import { assertPhaseAdvanceAllowed } from "@/lib/sessionLifecycle";
import { isUserPaused } from "@/lib/control";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // --- Parse & validate request payload ---
    const body = await req.json();
    const { userId, sessionId, to } = body as {
      userId: string;
      sessionId: string;
      to: SessionPhase;
    };

    if (!userId || !sessionId || !to) {
      return NextResponse.json(
        { error: "Missing userId, sessionId, or target phase." },
        { status: 400 }
      );
    }

    // --- Load session & verify ownership / integrity ---
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.userId !== userId) {
      return NextResponse.json(
        { error: "Session does not belong to user." },
        { status: 403 }
      );
    }

    if (session.closedAt) {
      return NextResponse.json(
        { error: "Session is already closed." },
        { status: 400 }
      );
    }

    /**
     * --- Pause safety gate (Ticket 1.3) ---
     *
     * When paused: no phase progression is allowed.
     * This protects psychological safety and prevents the system from pushing forward
     * while the user is intentionally paused (or the system has flagged a safety stop).
     *
     * We also log blocked attempts to preserve traceability.
     *
     * DO NOT remove or bypass this check.
     */
    if (await isUserPaused(userId)) {
      await prisma.auditEvent.create({
        data: {
          userId,
          sessionId,
          eventType: "ACTION_BLOCKED_PAUSED",
          meta: { action: "SESSION_ADVANCE", attemptedPhase: to },
        },
      });

      return NextResponse.json(
        { error: "System is paused; session phase advance blocked." },
        { status: 403 }
      );
    }

    // --- Validate lifecycle rule (single source of truth) ---
    assertPhaseAdvanceAllowed(session.phase, to);

    // --- Apply phase transition ---
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { phase: to },
    });

    // --- Audit successful transition ---
    await prisma.auditEvent.create({
      data: {
        userId,
        sessionId,
        eventType: "SESSION_PHASE_ADVANCED",
        meta: { from: session.phase, to },
      },
    });

    return NextResponse.json({ ok: true, session: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
