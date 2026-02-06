import "dotenv/config";

import { prisma, pressureStateService } from "../src/core/services";
import { PressureLevel } from "@prisma/client";

async function main() {
  const user = await prisma.user.create({ data: {} });

  const p1 = await pressureStateService.recordPressure({
    userId: user.id,
    dpi: 10,
    reason: "Baseline",
  });

  const p2 = await pressureStateService.recordPressure({
    userId: user.id,
    dpi: 60,
    reason: "Increased load",
  });

  const latest = await pressureStateService.getLatestPressure(user.id);

  console.log("append-only increments:", p1.id !== p2.id);
  console.log("threshold mapping:", p1.level === PressureLevel.LOW && p2.level === PressureLevel.HIGH);
  console.log("latest is second:", latest?.id === p2.id);

  // bounds check
  let blocked = false;
  try {
    await pressureStateService.recordPressure({
      userId: user.id,
      dpi: 101,
    });
  } catch {
    blocked = true;
  }
  console.log("bounds guard works:", blocked);

  // cleanup (optional)
  await prisma.pressureState.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Ticket 1.6 smoke test complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
