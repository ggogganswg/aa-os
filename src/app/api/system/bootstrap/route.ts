import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionPhase, SessionType, SystemState } from "@prisma/client";

export const runtime = "nodejs";
export async function POST() {
  const user = await prisma.user.create({ data: {} });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      type: SessionType.ASSESSMENT,
      phase: SessionPhase.OPENING,
      state: SystemState.UNINITIALIZED,
      purpose: "Bootstrap test session",
    },
  });

  await prisma.userContext.upsert({
    where: { userId: user.id },
    update: { lastSessionId: session.id },
    create: { userId: user.id, lastSessionId: session.id },
  });

  await prisma.auditEvent.create({
    data: {
      userId: user.id,
      sessionId: session.id,
      eventType: "BOOTSTRAP_CREATED",
      meta: { note: "Created test user + session" },
    },
  });

  return NextResponse.json({ ok: true, userId: user.id, sessionId: session.id });
}