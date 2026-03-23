import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime } from "@/lib/hours";
import AppLayout from "@/components/AppLayout";
import EmployeeDashboardClient from "./DashboardClient";

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, workDays: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!user) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntry = await prisma.timeEntry.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });

  // Calcular saldo do banco de horas (últimos 90 dias)
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, date: { gte: ninetyDaysAgo } },
    orderBy: { date: "desc" },
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId: user.id },
  });

  const userWorkDays = user.workDays || [1,2,3,4,5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);
  let balanceMinutes = 0;

  for (const entry of entries) {
    const dayOfWeek = entry.date.getDay();
    if (!userWorkDays.includes(dayOfWeek)) continue;
    const worked = calcWorkedMinutes(entry);
    balanceMinutes += worked - expectedPerDay;
  }

  for (const adj of adjustments) {
    balanceMinutes += adj.minutes;
  }

  // Step atual do botão de ponto
  let currentStep: 0 | 1 | 2 | 3 | 4 = 0;
  if (todayEntry) {
    if (!todayEntry.clockIn) currentStep = 0;
    else if (!todayEntry.lunchOut && !todayEntry.clockOut) currentStep = 1;
    else if (todayEntry.lunchOut && !todayEntry.lunchIn && !todayEntry.clockOut) currentStep = 2;
    else if ((todayEntry.lunchIn || !todayEntry.lunchOut) && !todayEntry.clockOut) currentStep = 3;
    else currentStep = 4;
  }

  // Últimos 7 dias para exibição
  const recentEntries = entries.slice(0, 7).map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    clockIn: formatTime(e.clockIn),
    lunchOut: formatTime(e.lunchOut),
    lunchIn: formatTime(e.lunchIn),
    clockOut: formatTime(e.clockOut),
    workedMinutes: calcWorkedMinutes(e),
    expectedMinutes: expectedPerDay,
  }));

  return (
    <AppLayout userName={user.name} userRole="EMPLOYEE" avatarUrl={user.avatarUrl ?? undefined}>
      <EmployeeDashboardClient
        user={{ name: user.name, weeklyHours: user.weeklyHours, overtimeMode: user.overtimeMode }}
        todayEntryId={todayEntry?.id ?? null}
        currentStep={currentStep}
        balanceMinutes={balanceMinutes}
        balanceLabel={formatMinutes(balanceMinutes)}
        recentEntries={recentEntries}
        expectedPerDay={expectedPerDay}
      />
    </AppLayout>
  );
}
