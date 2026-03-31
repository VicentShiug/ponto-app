import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime, calculateHourBankBalance
} from "@/lib/hours";
import { getDay, getYear, getMonth, startOfMonth, endOfMonth, isWithinInterval, isSameDay, parseDateFromAPI } from "@/lib/dates";
import AppLayout from "@/components/AppLayout";
import EmployeeDetailClient from "./DetailClient";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const paramsAwaited = await searchParams;
  const now = new Date();
  const year = paramsAwaited.year ? parseInt(paramsAwaited.year) : getYear(now);
  const month = paramsAwaited.month ? parseInt(paramsAwaited.month) - 1 : getMonth(now);

  const manager = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  const employee = await prisma.user.findUnique({ where: { id: params.id } });
  if (!manager || !employee || employee.role !== "EMPLOYEE") notFound();

  const monthFirstDay = startOfMonth(new Date(year, month, 1));
  const monthLastDay = endOfMonth(new Date(year, month, 1));

  const monthEntries = await prisma.timeEntry.findMany({
    where: { userId: employee.id, date: { gte: monthFirstDay, lte: monthLastDay } },
    orderBy: { date: "desc" },
  });

  const allEntries = await prisma.timeEntry.findMany({
    where: { userId: employee.id },
    orderBy: { date: "desc" },
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId: employee.id },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const expectedPerDay = expectedDailyMinutes(employee.weeklyHours);
  const balanceMinutes = await calculateHourBankBalance(employee.id);
  const monthBalanceMinutes = await calculateHourBankBalance(employee.id, { start: monthFirstDay, end: monthLastDay });

  const serializedEntries = monthEntries.map((e) => ({
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

  const monthLabel = new Date(year, month, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <AppLayout userName={manager.name} userRole="MANAGER" avatarUrl={manager.avatarUrl ?? undefined}>
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
        monthLabel={monthLabel}
        monthBalanceLabel={formatMinutes(monthBalanceMinutes)}
        currentYear={year}
        currentMonth={month + 1}
        expectedPerDay={expectedPerDay}
      />
    </AppLayout>
  );
}
