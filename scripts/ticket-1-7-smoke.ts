import "dotenv/config";

import { prisma, transitionGuardService } from "../src/core/services";
import { SystemState } from "@prisma/client";

async function main() {
  const user = await prisma.user.create({ data: {} });

  // No UserContext yet → should block insight
  const g1 = await transitionGuardService.canEnterInsightDelivery(user.id);
  console.log("blocks without context:", g1.ok === false);

  // Create UserContext but no ModelSet
  await prisma.userContext.create({ data: { userId: user.id } });
  const g2 = await transitionGuardService.canEnterInsightDelivery(user.id);
  console.log("blocks without modelset:", g2.ok === false);

  // Create ModelSet but no identity versions
  const ms = await prisma.modelSet.create({ data: { userId: user.id } });
  await prisma.userContext.update({
    where: { userId: user.id },
    data: { activeModelSetId: ms.id },
  });

  const g3 = await transitionGuardService.canEnterInsightDelivery(user.id);
  console.log("blocks without versions:", g3.ok === false);

  // Add identity version
  await prisma.identityModelVersion.create({
    data: {
      userId: user.id,
      modelSetId: ms.id,
      type: "CIM",
      version: 1,
      payload: {},
    },
  });

  const g4 = await transitionGuardService.canEnterInsightDelivery(user.id);
  console.log("allows with versions:", g4.ok === true);

  // Interpretation guard
  const i1 = transitionGuardService.canInterpret(SystemState.ASSESSING);
  const i2 = transitionGuardService.canInterpret(SystemState.MODELED);
  console.log("interpret blocked in ASSESSING:", i1.ok === false);
  console.log("interpret allowed otherwise:", i2.ok === true);

  // Pause override
  await prisma.controlFlag.create({
    data: {
      scope: "user",
      scopeId: user.id,
      paused: true,
      reason: "Manual pause",
    },
  });

  const t1 = await transitionGuardService.canTransition(
    user.id,
    SystemState.MODELED,
    SystemState.INSIGHT_DELIVERY
  );
  console.log("pause blocks transition:", t1.ok === false);

  // cleanup (optional)
  await prisma.identityModelVersion.deleteMany({ where: { userId: user.id } });
  await prisma.modelSet.deleteMany({ where: { userId: user.id } });
  await prisma.userContext.deleteMany({ where: { userId: user.id } });
  await prisma.controlFlag.deleteMany({ where: { scopeId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Ticket 1.7 smoke test complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
