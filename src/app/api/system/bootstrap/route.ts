/**
 * SYSTEM BOOTSTRAP ROUTE (AA-OS)
 *
 * Responsibility:
 * - Create a minimal test user + session to validate the system end-to-end.
 * - Ensure UserContext exists (no session pointer set here).
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
 * - Must NOT set lastClosedSessionId here; closure-only anchor.
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

  // Ensure UserContext exists. Governance: do NOT set lastClosedSessionId on open.
  await prisma.userContext.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
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
