import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime,
} from "@/lib/hours";
import AppLayout from "@/components/AppLayout";
import { Toaster } from "@/components/Toaster";
import EmployeeDetailClient from "./DetailClient";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const manager = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  const employee = await prisma.user.findUnique({ where: { id: params.id } });
  if (!manager || !employee || employee.role !== "EMPLOYEE") notFound();

  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  since90.setHours(0, 0, 0, 0);

  const entries = await prisma.timeEntry.findMany({
    where: { userId: employee.id, date: { gte: since90 } },
    orderBy: { date: "desc" },
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId: employee.id },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const expectedPerDay = expectedDailyMinutes(employee.weeklyHours);
  let balanceMinutes = 0;
  for (const entry of entries) {
    const dow = entry.date.getDay();
    if (dow === 0 || dow === 6) continue;
    balanceMinutes += calcWorkedMinutes(entry) - expectedPerDay;
  }
  for (const adj of adjustments) balanceMinutes += adj.minutes;

  const serializedEntries = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    clockIn: formatTime(e.clockIn),
    lunchOut: formatTime(e.lunchOut),
    lunchIn: formatTime(e.lunchIn),
    clockOut: formatTime(e.clockOut),
    workedMinutes: calcWorkedMinutes(e),
    expectedMinutes: expectedPerDay,
    rawClockIn: e.clockIn?.toISOString() ?? null,
    rawLunchOut: e.lunchOut?.toISOString() ?? null,
    rawLunchIn: e.lunchIn?.toISOString() ?? null,
    rawClockOut: e.clockOut?.toISOString() ?? null,
  }));

  const serializedAdjustments = adjustments.map((a) => ({
    id: a.id,
    minutes: a.minutes,
    reason: a.reason,
    managerName: a.manager.name,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <AppLayout userName={manager.name} userRole="MANAGER" avatarUrl={manager.avatarUrl ?? undefined}>
      <Toaster />
      <EmployeeDetailClient
        employee={{
          id: employee.id,
          name: employee.name,
          email: employee.email,
          weeklyHours: employee.weeklyHours,
          overtimeMode: employee.overtimeMode,
        }}
        entries={serializedEntries}
        adjustments={serializedAdjustments}
        balanceMinutes={balanceMinutes}
        balanceLabel={formatMinutes(balanceMinutes)}
        expectedPerDay={expectedPerDay}
      />
    </AppLayout>
  );
}
