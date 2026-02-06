/**
 * CONTROL: PAUSE (AA-OS)
 *
 * Responsibility:
 * - Activate a user-level pause flag (governance lock).
 * - Emit an audit event documenting the pause and its reason.
 *
 * Governance intent:
 * - Pause is a hard safety mechanism. When paused, AA-OS must not push forward
 *   (no phase advances, no system transitions, no insight escalation).
 *
 * Implementation notes:
 * - Control flags are append-only for traceability.
 * - "Effective pause state" is determined by the latest flag.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, reason } = body as { userId: string; reason?: string };

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    // Create a pause flag (append-only history)
    const flag = await prisma.controlFlag.create({
      data: {
        scope: "user",
        scopeId: userId,
        paused: true,
        reason: reason ?? "User paused system",
      },
    });

    // Audit the governance action (required)
    await prisma.auditEvent.create({
      data: {
        userId,
        eventType: "SYSTEM_PAUSED",
        meta: { reason: flag.reason },
      },
    });

    return NextResponse.json({ ok: true, paused: true, flag });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
