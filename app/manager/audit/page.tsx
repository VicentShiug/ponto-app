import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import AuditClient from "./AuditClient";

export default async function AuditPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const manager = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!manager) redirect("/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { name: true, email: true } },
      targetUser: { select: { name: true, email: true } },
    },
  });

  const serialized = logs.map((l) => ({
    id: l.id,
    action: l.action,
    details: l.details as Record<string, unknown>,
    createdAt: l.createdAt.toISOString(),
    actor: l.actor,
    targetUser: l.targetUser,
  }));

  return (
    <AppLayout userName={manager.name} userRole="MANAGER" avatarUrl={manager.avatarUrl ?? undefined}>
      <AuditClient logs={serialized} />
    </AppLayout>
  );
}
