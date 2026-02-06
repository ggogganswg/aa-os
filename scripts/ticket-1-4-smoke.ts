import "dotenv/config";

import { prisma, identityVersionService } from "../src/core/services";
import { IdentityModelType } from "@prisma/client";

async function main() {
  const user = await prisma.user.create({ data: {} });
  const modelSet = await prisma.modelSet.create({
    data: { userId: user.id, status: "DRAFT" },
  });

  const v1 = await identityVersionService.createVersion({
    userId: user.id,
    modelSetId: modelSet.id,
    type: IdentityModelType.CIM,
    payload: { foo: "bar" },
  });

  const v2 = await identityVersionService.createVersion({
    userId: user.id,
    modelSetId: modelSet.id,
    type: IdentityModelType.CIM,
    payload: { foo: "baz" },
  });

  const latest = await identityVersionService.getLatestVersion({
    userId: user.id,
    modelSetId: modelSet.id,
    type: IdentityModelType.CIM,
  });

  console.log("version increments:", v1.version === 1 && v2.version === 2);
  console.log("latest is v2:", latest?.id === v2.id);

  // cleanup (optional)
  await prisma.identityModelVersion.deleteMany({ where: { userId: user.id } });
  await prisma.modelSet.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Ticket 1.4 smoke test complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
