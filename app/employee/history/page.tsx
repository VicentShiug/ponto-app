import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime } from "@/lib/hours";
import { getDaySP, getYear, getMonth, addDays, startOfMonth, endOfMonth, startOfDay, endOfDay, isAfter, isSameDay, isWithinInterval, formatDateISO, parseDateFromAPI, parseZonedStart, parseZonedEnd } from "@/lib/dates";
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
  const month = params.month ? parseInt(params.month) : getMonth(now) + 1;
  
  const monthStr = month.toString().padStart(2, "0");
  const firstDay = parseZonedStart(`${year}-${monthStr}-01`);
  // End of month is tricky with zoned. Just take end of month of the first day.
  const lastDay = endOfMonth(firstDay);

  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, date: { gte: firstDay, lte: lastDay } },
    orderBy: { date: "asc" },
  });

  const userWorkDays = user.workDays || [1,2,3,4,5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);

  const days = [];
  for (let d = new Date(firstDay); d <= lastDay; d = addDays(d, 1)) {
    const dayISO = formatDateISO(d);
    const entry = entries.find(
      (e) => formatDateISO(e.date) === dayISO
    );
    const dow = getDaySP(d);
    const isWeekend = !userWorkDays.includes(dow);
    const workedMinutes = entry ? calcWorkedMinutes(entry) : 0;
    const diff = isWeekend ? 0 : workedMinutes - expectedPerDay;

    days.push({
      id: entry?.id,
      date: dayISO,
      isWeekend,
      isFuture: isAfter(startOfDay(d), now),
      clockIn: entry ? formatTime(entry.clockIn) : null,
      lunchOut: entry ? formatTime(entry.lunchOut) : null,
      lunchIn: entry ? formatTime(entry.lunchIn) : null,
      clockOut: entry ? formatTime(entry.clockOut) : null,
      workedMinutes,
      diffMinutes: diff,
      status: isWeekend
        ? "weekend"
        : !entry || (!entry.clockIn && !entry.clockOut)
          ? isAfter(startOfDay(d), now)
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

  const monthLabel = new Date(year, month - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

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
