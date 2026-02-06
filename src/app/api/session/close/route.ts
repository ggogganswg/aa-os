/**
 * SESSION CLOSE ROUTE (AA-OS)
 *
 * Responsibility:
 * - Close an existing session by setting closedAt.
 * - Enforce closure rules (must be in CLOSURE phase).
 * - Ensure only the owning user can close the session.
 * - Emit an audit event for traceability.
 *
 * Governance intent:
 * - "Closing" a session is a structural commitment that the arc is complete.
 * - We do not allow premature closure because it undermines system integrity
 *   and makes downstream analytics ambiguous.
 *
 * Implementation notes:
 * - The close operation is idempotent: closing an already-closed session returns ok.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionPhase } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sessionId } = body as { userId: string; sessionId: string };

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: "Missing userId or sessionId." },
        { status: 400 }
      );
    }

    // --- Load session & verify ownership ---
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

    // Idempotent close: if already closed, return success.
    if (session.closedAt) {
      return NextResponse.json({ ok: true, session });
    }

    /**
     * Closure rule:
     * - Must be in CLOSURE phase before closing.
     * This preserves phase semantics and prevents ambiguous "half-finished" sessions.
     */
    if (session.phase !== SessionPhase.CLOSURE) {
      return NextResponse.json(
        {
          error: `Cannot close session unless phase is CLOSURE (current: ${session.phase}).`,
        },
        { status: 400 }
      );
    }

    // Apply closure
    const closed = await prisma.session.update({
      where: { id: sessionId },
      data: { closedAt: new Date() },
    });

    // Audit closure (required)
    await prisma.auditEvent.create({
      data: {
        userId,
        sessionId,
        eventType: "SESSION_CLOSED",
        meta: { closedAt: closed.closedAt },
      },
    });

    return NextResponse.json({ ok: true, session: closed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
