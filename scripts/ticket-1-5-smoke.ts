import "dotenv/config";

import { prisma, confidenceStateService } from "../src/core/services";
import { ConfidenceDomain } from "@prisma/client";

async function main() {
  const user = await prisma.user.create({ data: {} });

  const c1 = await confidenceStateService.recordConfidence({
    userId: user.id,
    domain: ConfidenceDomain.IDENTITY_MODEL,
    key: "CIM.structure",
    value: 0.4,
    reason: "Initial structure captured",
  });

  const c2 = await confidenceStateService.recordConfidence({
    userId: user.id,
    domain: ConfidenceDomain.IDENTITY_MODEL,
    key: "CIM.structure",
    value: 0.7,
    reason: "Second pass structure captured",
  });

  const latest = await confidenceStateService.getLatestConfidence({
    userId: user.id,
    domain: ConfidenceDomain.IDENTITY_MODEL,
    key: "CIM.structure",
  });

  console.log("append-only increments:", c1.id !== c2.id);
  console.log("latest is second:", latest?.id === c2.id);

  // bounds check
  let blocked = false;
  try {
    await confidenceStateService.recordConfidence({
      userId: user.id,
      domain: ConfidenceDomain.SYSTEM,
      key: "bad.value",
      value: 2,
    });
  } catch {
    blocked = true;
  }
  console.log("bounds guard works:", blocked);

  // cleanup (optional)
  await prisma.confidenceState.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Ticket 1.5 smoke test complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
