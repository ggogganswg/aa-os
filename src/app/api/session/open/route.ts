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

    const session = await prisma.session.create({
      data: {
        userId,
        type: type ?? SessionType.ASSESSMENT,
        phase: SessionPhase.OPENING,
        state: SystemState.UNINITIALIZED,
        purpose: purpose ?? "New session",
      },
    });

    await prisma.userContext.upsert({
      where: { userId },
      update: { lastSessionId: session.id },
      create: { userId, lastSessionId: session.id },
    });

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
