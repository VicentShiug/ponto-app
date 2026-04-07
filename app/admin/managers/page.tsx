import { prisma } from "@/lib/prisma";
import ManagersClient from "./managers-client";

export default async function ManagersPage() {
  const dbManagers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  const managers = dbManagers.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return <ManagersClient managers={managers} />;
}
