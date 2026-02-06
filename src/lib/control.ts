/**
 * Control Surface Helpers (AA-OS)
 *
 * Purpose:
 * - Provide small, reusable helpers for governance controls like pause/resume.
 *
 * Design principles:
 * - Control state is append-only: we do NOT delete control flags.
 *   This preserves an auditable history of governance changes.
 * - Effective control state is determined by the latest relevant flag.
 *
 * Note:
 * - Current implementation supports user-scoped pause.
 * - Organization/global pause can be layered later using scope + scopeId.
 */

import { prisma } from "@/lib/prisma";

/**
 * Returns whether the user is currently paused.
 *
 * Effective pause state = latest ControlFlag where paused=true (user scope).
 * This supports a simple "most recent wins" model without rewriting history.
 */
export async function isUserPaused(userId: string): Promise<boolean> {
  const latest = await prisma.controlFlag.findFirst({
    where: { scope: "user", scopeId: userId },
    orderBy: { updatedAt: "desc" },
  });

  // Default to not paused if no flags exist yet.
  return latest?.paused ?? false;
}
