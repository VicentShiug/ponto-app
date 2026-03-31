import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, formatMinutes } from "@/lib/hours";
import { getDay, subDays, startOfDay, parseDateFromAPI } from "@/lib/dates";
import AppLayout from "@/components/AppLayout";
import BankClient from "./BankClient";

export default async function EmployeeBankPage() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, workDays: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!user) redirect("/login");

  const ninetyDaysAgo = subDays(startOfDay(new Date()), 90);

  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, date: { gte: ninetyDaysAgo } },
    orderBy: { date: "desc" },
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId: user.id },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const userWorkDays = user.workDays || [1,2,3,4,5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);
  let balanceMinutes = 0;

  for (const entry of entries) {
    const dayOfWeek = getDay(parseDateFromAPI(entry.date.toString()));
    if (!userWorkDays.includes(dayOfWeek)) continue;
    const worked = calcWorkedMinutes(entry);
    balanceMinutes += worked - expectedPerDay;
  }

  for (const adj of adjustments) {
    balanceMinutes += adj.minutes;
  }

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
        balanceMinutes={balanceMinutes}
        balanceLabel={formatMinutes(balanceMinutes)}
        overtimeMode={user.overtimeMode}
        adjustments={serializedAdjustments}
      />
    </AppLayout>
  );
}
