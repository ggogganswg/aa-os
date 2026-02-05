import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionPhase } from "@prisma/client";
import { assertPhaseAdvanceAllowed } from "@/lib/sessionLifecycle";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sessionId, to } = body as {
      userId: string;
      sessionId: string;
      to: SessionPhase;
    };

    if (!userId || !sessionId || !to) {
      return NextResponse.json(
        { error: "Missing userId, sessionId, or to." },
        { status: 400 }
      );
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.userId !== userId) {
      return NextResponse.json({ error: "Session does not belong to user." }, { status: 403 });
    }
    if (session.closedAt) {
      return NextResponse.json({ error: "Session is closed." }, { status: 400 });
    }

    assertPhaseAdvanceAllowed(session.phase, to);

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { phase: to },
    });

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
