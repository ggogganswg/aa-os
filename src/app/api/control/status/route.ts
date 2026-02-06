/**
 * CONTROL: STATUS (AA-OS)
 *
 * Responsibility:
 * - Return the effective pause state for a user.
 *
 * Why this exists:
 * - Provides a simple integration surface for UI, tests, and operational tooling.
 * - Makes governance state observable without mutating anything.
 *
 * Effective state model:
 * - Control flags are append-only.
 * - Current/effective state is determined by the most recent ControlFlag for the scope.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  // Latest flag wins (append-only history)
  const latest = await prisma.controlFlag.findFirst({
    where: { scope: "user", scopeId: userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    userId,
    paused: latest?.paused ?? false,
    reason: latest?.reason ?? null,
    updatedAt: latest?.updatedAt ?? null,
  });
}
