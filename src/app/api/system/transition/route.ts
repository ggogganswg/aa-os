import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SystemState } from "@prisma/client";
import { assertTransitionAllowed } from "@/lib/systemState";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
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

    const pauseFlag = await prisma.controlFlag.findFirst({
      where: { scope: "user", scopeId: userId, paused: true },
      orderBy: { updatedAt: "desc" },
    });

    const ctx = {
      isPaused: Boolean(pauseFlag),
      hasModels: false, // placeholder until EPIC 3
    };

    assertTransitionAllowed(from, to, ctx);

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { state: to },
    });

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
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
