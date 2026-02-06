/**
 * SESSION OPEN ROUTE (AA-OS)
 *
 * Responsibility:
 * - Create a new session container for a user.
 * - Initialize it to OPENING phase and UNINITIALIZED system state.
 * - Ensure UserContext exists (no session pointer set here).
 * - Emit an audit event for traceability.
 *
 * Why this exists:
 * - Sessions are the unit of coherent interaction: a bounded arc with phases.
 * - This route creates structure, not insight.
 *
 * Governance constraints:
 * - Must not create sessions for other users.
 * - Must not embed coaching/prescriptive behavior.
 * - Must always audit creation (no silent session creation).
 * - Must NOT set lastClosedSessionId here; closure-only anchor.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionPhase, SessionType, SystemState } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, type, purpose } = body as {
      userId: string;
      type?: SessionType;
      purpose?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    // Create a session with deterministic initial values.
    const session = await prisma.session.create({
      data: {
        userId,
        type: type ?? SessionType.ASSESSMENT,
        phase: SessionPhase.OPENING,
        state: SystemState.UNINITIALIZED,
        purpose: purpose ?? "New session",
      },
    });

    // Ensure UserContext exists. Governance: do NOT set lastClosedSessionId on open.
    await prisma.userContext.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Audit session creation (required).
    await prisma.auditEvent.create({
      data: {
        userId,
        sessionId: session.id,
        eventType: "SESSION_OPENED",
        meta: { type: session.type, purpose: session.purpose },
      },
    });

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
