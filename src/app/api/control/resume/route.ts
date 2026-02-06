/**
 * CONTROL: RESUME (AA-OS)
 *
 * Responsibility:
 * - Deactivate a user-level pause by writing a new "paused=false" control flag.
 * - Emit an audit event documenting the resume and its reason.
 *
 * Governance intent:
 * - We do not delete pause history. We append a new record.
 * - This preserves traceability and prevents "silent" governance changes.
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

    // Append a resume flag (append-only history)
    const flag = await prisma.controlFlag.create({
      data: {
        scope: "user",
        scopeId: userId,
        paused: false,
        reason: reason ?? "User resumed system",
      },
    });

    // Audit the governance action (required)
    await prisma.auditEvent.create({
      data: {
        userId,
        eventType: "SYSTEM_RESUMED",
        meta: { reason: flag.reason },
      },
    });

    return NextResponse.json({ ok: true, paused: false, flag });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
