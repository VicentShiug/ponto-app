import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const manager = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!manager) redirect("/login");

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", active: true, managerId: session.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, weeklyHours: true, overtimeMode: true },
  });

  return (
    <AppLayout userName={manager.name} userRole="MANAGER" avatarUrl={manager.avatarUrl ?? undefined}>
      <ReportsClient employees={employees} />
    </AppLayout>
  );
}
