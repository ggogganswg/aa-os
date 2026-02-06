/**
 * SYSTEM BOOTSTRAP ROUTE (AA-OS)
 *
 * Responsibility:
 * - Create a minimal test user + session to validate the system end-to-end.
 * - Initialize UserContext with lastSessionId.
 * - Emit an audit event for traceability.
 *
 * Why this exists:
 * - It accelerates development by providing a deterministic "known-good" starting state.
 * - It is NOT a production onboarding flow.
 *
 * Governance constraints:
 * - Must not include personal data.
 * - Must not embed or expose secrets.
 * - Must not create prescriptive outputs; only creates structural records.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionPhase, SessionType, SystemState } from "@prisma/client";

export const runtime = "nodejs";

export async function POST() {
  // Create a user + initial session for testing and development scaffolding.
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

  // UserContext provides a stable "last known session" pointer for UX flows later.
  await prisma.userContext.upsert({
    where: { userId: user.id },
    update: { lastSessionId: session.id },
    create: { userId: user.id, lastSessionId: session.id },
  });

  // Audit creation for traceability (required for governance).
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
