import "dotenv/config";

import { prisma, transitionGuardService, controlFlagService } from "../src/core/services";
import { SystemState } from "@prisma/client";

async function main() {
  const user = await prisma.user.create({ data: {} });

  // Not paused initially
  const a1 = await transitionGuardService.canTransition(user.id, SystemState.MODELED, SystemState.LONGITUDINAL_TRACKING);
  console.log("not paused allows transition:", a1.ok === true);

  // Set SYSTEM pause
  await controlFlagService.setFlag({
    scope: "system",
    paused: true,
    reason: "Operator pause",
  });

  const a2 = await transitionGuardService.canTransition(user.id, SystemState.MODELED, SystemState.LONGITUDINAL_TRACKING);
  console.log("system pause blocks transition:", a2.ok === false);

  // Allow transition into PAUSED even while paused (idempotent)
  const a3 = await transitionGuardService.canTransition(user.id, SystemState.MODELED, SystemState.PAUSED);
  console.log("system pause allows transition to PAUSED:", a3.ok === true);

  // Resume SYSTEM
  await controlFlagService.setFlag({
    scope: "system",
    paused: false,
    reason: "Operator resume",
  });

  // User pause still works
  await controlFlagService.setFlag({
    scope: "user",
    scopeId: user.id,
    paused: true,
    reason: "User paused",
  });

  const a4 = await transitionGuardService.canTransition(user.id, SystemState.MODELED, SystemState.LONGITUDINAL_TRACKING);
  console.log("user pause blocks transition:", a4.ok === false);

  // cleanup (optional)
  await prisma.controlFlag.deleteMany({ where: { OR: [{ scope: "system" }, { scope: "user", scopeId: user.id }] } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Ticket 1.9 smoke test complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
