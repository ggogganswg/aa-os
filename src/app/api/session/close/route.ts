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

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.userId !== userId) {
      return NextResponse.json({ error: "Session does not belong to user." }, { status: 403 });
    }
    if (session.closedAt) {
      return NextResponse.json({ ok: true, session }); // idempotent close
    }

    // Enforce: must be in CLOSURE phase before closing
    if (session.phase !== SessionPhase.CLOSURE) {
      return NextResponse.json(
        { error: `Cannot close session unless phase is CLOSURE (current: ${session.phase}).` },
        { status: 400 }
      );
    }

    const closed = await prisma.session.update({
      where: { id: sessionId },
      data: { closedAt: new Date() },
    });

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
