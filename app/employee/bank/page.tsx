import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHourBankDetails } from "@/lib/hour-bank";
import AppLayout from "@/components/AppLayout";
import BankClient from "./BankClient";

export default async function EmployeeBankPage() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, workDays: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!user) redirect("/login");

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId: user.id },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const details = await getHourBankDetails(user.id);

  const serializedAdjustments = adjustments.map((a) => ({
    id: a.id,
    minutes: a.minutes,
    reason: a.reason,
    managerName: a.manager.name,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <AppLayout userName={user.name} userRole="EMPLOYEE" avatarUrl={user.avatarUrl ?? undefined}>
      <BankClient
        details={details}
        overtimeMode={user.overtimeMode}
        adjustments={serializedAdjustments}
      />
    </AppLayout>
  );
}
