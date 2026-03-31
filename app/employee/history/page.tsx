import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime } from "@/lib/hours";
import { getDay, getYear, getMonth, addDays, startOfMonth, endOfMonth, startOfDay, endOfDay, isAfter, isSameDay, isWithinInterval, parseDateFromAPI } from "@/lib/dates";
import AppLayout from "@/components/AppLayout";
import HistoryClient from "./HistoryClient";

export default async function EmployeeHistory({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYEE") redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, workDays: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : getYear(now);
  const month = params.month ? parseInt(params.month) - 1 : getMonth(now);
  
  const firstDay = startOfMonth(new Date(year, month, 1));
  const lastDay = endOfMonth(new Date(year, month, 1));

  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, date: { gte: firstDay, lte: lastDay } },
    orderBy: { date: "asc" },
  });

  const userWorkDays = user.workDays || [1,2,3,4,5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);

  const days = [];
  for (let d = new Date(firstDay); d <= lastDay; d = addDays(d, 1)) {
    const dayDate = startOfDay(d);
    const entry = entries.find(
      (e) => isSameDay(parseDateFromAPI(e.date.toISOString()), dayDate)
    );
    const dow = getDay(dayDate);
    const isWeekend = !userWorkDays.includes(dow);
    const workedMinutes = entry ? calcWorkedMinutes(entry) : 0;
    const diff = isWeekend ? 0 : workedMinutes - expectedPerDay;

    days.push({
      id: entry?.id,
      date: dayDate.toISOString().slice(0, 10),
      isWeekend,
      isFuture: isAfter(dayDate, now),
      clockIn: entry ? formatTime(entry.clockIn) : null,
      lunchOut: entry ? formatTime(entry.lunchOut) : null,
      lunchIn: entry ? formatTime(entry.lunchIn) : null,
      clockOut: entry ? formatTime(entry.clockOut) : null,
      workedMinutes,
      diffMinutes: diff,
      status: isWeekend
        ? "weekend"
        : !entry || (!entry.clockIn && !entry.clockOut)
        ? isAfter(dayDate, now)
          ? "future"
          : "absent"
        : entry.clockIn && entry.clockOut
        ? "complete"
        : "incomplete",
    });
  }

  const weeks: { week: string; worked: number; expected: number }[] = [];
  let weekStart = new Date(firstDay);
  let weekIdx = 1;
  while (weekStart <= lastDay) {
    const weekEnd = addDays(weekStart, 6);
    const weekDays = days.filter((d) => {
      const dd = parseDateFromAPI(d.date);
      return isWithinInterval(dd, { start: weekStart, end: weekEnd }) && !d.isWeekend;
    });
    const workedMins = weekDays.reduce((s, d) => s + d.workedMinutes, 0);
    const expectedMins = weekDays.length * expectedPerDay;
    weeks.push({
      week: `Sem ${weekIdx}`,
      worked: Math.round((workedMins / 60) * 10) / 10,
      expected: Math.round((expectedMins / 60) * 10) / 10,
    });
    weekStart = addDays(weekStart, 7);
    weekIdx++;
  }

  const totalWorked = days.reduce((s, d) => s + d.workedMinutes, 0);
  const workDays = days.filter((d) => !d.isWeekend && !d.isFuture).length;
  const totalExpected = workDays * expectedPerDay;

  const monthLabel = new Date(year, month, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <AppLayout userName={user.name} userRole="EMPLOYEE" avatarUrl={user.avatarUrl ?? undefined}>
      <HistoryClient
        days={days}
        weeks={weeks}
        monthLabel={monthLabel}
        totalWorkedLabel={formatMinutes(totalWorked)}
        totalExpectedLabel={formatMinutes(totalExpected)}
        balanceLabel={formatMinutes(totalWorked - totalExpected)}
        balanceMinutes={totalWorked - totalExpected}
      />
    </AppLayout>
  );
}
