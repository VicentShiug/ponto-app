import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime } from "@/lib/hours";
import { getDaySP, getYear, getMonth, addDays, startOfMonth, endOfMonth, startOfDay, endOfDay, isAfter, isSameDay, isWithinInterval, formatDateISO, parseDateFromAPI, parseZonedStart, parseZonedEnd } from "@/lib/dates";
import { getHolidays, isHoliday } from "@/lib/holidays";
import { getCertificatesForDateRange, getFullDayCertificateForDate, getPartialCertificateForDate, getPartialCertificateMinutes } from "@/lib/medical-certificates";
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

  const [holidaysCurrent, holidaysNext] = await Promise.all([
    getHolidays(year),
    getHolidays(year + 1),
  ]);
  const holidays = [...holidaysCurrent, ...holidaysNext];

  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, date: { gte: firstDay, lte: lastDay } },
    orderBy: { date: "asc" },
  });

  // Fetch medical certificates
  const monthCertificates = await getCertificatesForDateRange(user.id, firstDay, lastDay);

  // All certificates for the certificate list
  const allCertificates = await prisma.medicalCertificate.findMany({
    where: { userId: user.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
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
    
    // Check for certificates
    const fullDayCert = getFullDayCertificateForDate(dayISO, monthCertificates);
    const partialCert = getPartialCertificateForDate(dayISO, monthCertificates);
    
    const workedMinutes = fullDayCert ? 0 : (entry ? calcWorkedMinutes(entry) : 0);
    
    // Check if it's a holiday
    const holiday = isHoliday(d, holidays);
    
    // Compute diff
    let diff = 0;
    if (fullDayCert) {
      diff = 0; // FULL_DAY certificate → neutral
    } else if (holiday) {
      diff = workedMinutes;
    } else if (!isWeekend) {
      if (partialCert) {
        const certMinutes = getPartialCertificateMinutes(partialCert);
        const adjustedExpected = Math.max(0, expectedPerDay - certMinutes);
        diff = workedMinutes - adjustedExpected;
      } else {
        diff = workedMinutes - expectedPerDay;
      }
    }

    // Certificate info for the day
    const certificate = fullDayCert
      ? { type: "FULL_DAY" as const, startDate: fullDayCert.startDate?.toISOString() || null, endDate: fullDayCert.endDate?.toISOString() || null, startTime: null, endTime: null }
      : partialCert
        ? { type: "PARTIAL" as const, startDate: null, endDate: null, startTime: partialCert.startTime, endTime: partialCert.endTime }
        : null;

    days.push({
      id: entry?.id,
      date: dayISO,
      isWeekend,
      isFuture: isAfter(startOfDay(d), now),
      holiday: holiday ? { name: holiday.name } : null,
      certificate,
      clockIn: entry ? formatTime(entry.clockIn) : null,
      lunchOut: entry ? formatTime(entry.lunchOut) : null,
      lunchIn: entry ? formatTime(entry.lunchIn) : null,
      clockOut: entry ? formatTime(entry.clockOut) : null,
      workedMinutes,
      diffMinutes: diff,
      status: isWeekend || holiday
        ? "weekend"
        : !entry || (!entry.clockIn && !entry.clockOut)
          ? isAfter(startOfDay(d), now)
          ? "future"
          : fullDayCert ? "certificate" : "absent"
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
    // Real expected sum for the week
    const expectedMins = weekDays.reduce((s, d) => {
      if (d.certificate?.type === "FULL_DAY" || d.holiday) return s;
      if (d.certificate?.type === "PARTIAL") {
        const certMins = getPartialCertificateMinutes({ startTime: d.certificate.startTime, endTime: d.certificate.endTime } as any);
        return s + Math.max(0, expectedPerDay - certMins);
      }
      return s + expectedPerDay;
    }, 0);
    
    weeks.push({
      week: `Sem ${weekIdx}`,
      worked: Math.round((workedMins / 60) * 10) / 10,
      expected: Math.round((expectedMins / 60) * 10) / 10,
    });
    weekStart = addDays(weekStart, 7);
    weekIdx++;
  }

  const daysToCount = days.filter((d) => !d.isWeekend && !d.isFuture);
  const totalWorked = daysToCount.reduce((s, d) => s + d.workedMinutes, 0);
  const totalExpected = daysToCount.reduce((s, d) => {
    if (d.certificate?.type === "FULL_DAY" || d.holiday) return s;
    if (d.certificate?.type === "PARTIAL") {
      const certMins = getPartialCertificateMinutes({ startTime: d.certificate.startTime, endTime: d.certificate.endTime } as any);
      return s + Math.max(0, expectedPerDay - certMins);
    }
    return s + expectedPerDay;
  }, 0);

  const monthLabel = new Date(year, month - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const serializedCertificates = allCertificates.map((c) => ({
    id: c.id,
    userId: c.userId,
    createdById: c.createdById,
    createdByName: c.createdBy.name,
    type: c.type as "PARTIAL" | "FULL_DAY",
    date: c.date?.toISOString() || null,
    startDate: c.startDate?.toISOString() || null,
    endDate: c.endDate?.toISOString() || null,
    startTime: c.startTime,
    endTime: c.endTime,
    reason: c.reason,
    createdAt: c.createdAt.toISOString(),
  }));

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
        certificates={serializedCertificates}
        userId={user.id}
      />
    </AppLayout>
  );
}
