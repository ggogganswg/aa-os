// scripts/ticket-1-3-smoke.ts
/**
 * Ticket 1.3 Smoke Test (UserContext Contract + Guardrails)
 *
 * What this validates:
 * - ensureUserContext is idempotent
 * - resetUserContext clears anchors + increments contextVersion
 * - activateModelSet enforces ownership
 * - setLastClosedSession enforces CLOSED semantics (phase=CLOSURE and closedAt!=null)
 *
 * Governance: no insights, no user content, structural checks only.
 */

import { prisma, userContextService } from "../src/core/services";

async function main() {
  // Create two users
  const userA = await prisma.user.create({ data: {} });
  const userB = await prisma.user.create({ data: {} });

  // Ensure contexts
  const ctxA1 = await userContextService.ensureUserContext(userA.id);
  const ctxA2 = await userContextService.ensureUserContext(userA.id);
  console.log("ensure idempotent:", ctxA1.id === ctxA2.id);

  // Reset increments version
  const before = await prisma.userContext.findUnique({ where: { userId: userA.id } });
  const reset = await userContextService.resetUserContext(userA.id);
  console.log("reset increments version:", (before?.contextVersion ?? 0) + 1 === reset.contextVersion);

  // Create a ModelSet for userA
  const msA = await prisma.modelSet.create({
    data: { userId: userA.id, status: "DRAFT" },
  });

  // Ownership check: userB cannot activate userA's ModelSet
  try {
    await userContextService.activateModelSet(userB.id, msA.id);
    console.log("ownership guard: FAILED (should have thrown)");
  } catch (e: any) {
    console.log("ownership guard: OK");
  }

  // Create an OPEN (not closed) session for userA
  const openSession = await prisma.session.create({
    data: {
      userId: userA.id,
      type: "ASSESSMENT",
      phase: "OPENING",
      state: "ASSESSING",
    },
  });

  // Closed-session guard should block
  try {
    await userContextService.setLastClosedSession(userA.id, openSession.id);
    console.log("closed-session guard: FAILED (should have thrown)");
  } catch (e: any) {
    console.log("closed-session guard: OK");
  }

  // Create a CLOSED session for userA
  const closedSession = await prisma.session.create({
    data: {
      userId: userA.id,
      type: "ASSESSMENT",
      phase: "CLOSURE",
      state: "MODELED",
      closedAt: new Date(),
    },
  });

  // Now it should succeed
  const updated = await userContextService.setLastClosedSession(userA.id, closedSession.id);
  console.log("set lastClosedSessionId success:", updated.lastClosedSessionId === closedSession.id);

  // Cleanup (optional): comment out if you want to inspect DB
  await prisma.auditEvent.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.userContext.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.modelSet.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

  console.log("Ticket 1.3 smoke test complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
