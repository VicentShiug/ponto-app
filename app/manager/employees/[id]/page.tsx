import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcWorkedMinutes, expectedDailyMinutes, formatMinutes, formatTime, calculateHourBankBalance
} from "@/lib/hours";
import { getDaySP, getYear, getMonth, startOfMonth, endOfMonth, isWithinInterval, isSameDay, parseDateFromAPI, formatDateISO } from "@/lib/dates";
import { getHolidays, isHoliday } from "@/lib/holidays";
import { getCertificatesForDateRange, getFullDayCertificateForDate, getPartialCertificateForDate, getPartialCertificateMinutes } from "@/lib/medical-certificates";
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
  if (!manager || !employee || employee.role !== "EMPLOYEE" || employee.managerId !== session.userId) notFound();

  const monthFirstDay = startOfMonth(new Date(year, month, 1));
  const monthLastDay = endOfMonth(new Date(year, month, 1));

  const [holidaysCurrent, holidaysNext] = await Promise.all([
    getHolidays(year),
    getHolidays(year + 1),
  ]);
  const holidays = [...holidaysCurrent, ...holidaysNext];

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

  // Fetch medical certificates for this month
  const monthCertificates = await getCertificatesForDateRange(employee.id, monthFirstDay, monthLastDay);

  // Also fetch all certificates for the adjustments tab
  const allCertificates = await prisma.medicalCertificate.findMany({
    where: { userId: employee.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serializedEntries = monthEntries.map((e) => {
    const holiday = isHoliday(e.date, holidays);
    const dateISO = formatDateISO(e.date);
    
    const dayOfWeek = getDaySP(e.date);
    const userWorkDays = employee.workDays || [1, 2, 3, 4, 5];
    const isWeekend = !userWorkDays.includes(dayOfWeek);
    
    // Check for certificates
    const fullDayCert = getFullDayCertificateForDate(dateISO, monthCertificates);
    const partialCert = getPartialCertificateForDate(dateISO, monthCertificates);
    
    let expectedForEntry = expectedPerDay;
    if (fullDayCert) {
      expectedForEntry = 0; // FULL_DAY → delta = 0
    } else if (holiday || isWeekend) {
      expectedForEntry = 0;
    } else if (partialCert) {
      const certMinutes = getPartialCertificateMinutes(partialCert);
      expectedForEntry = Math.max(0, expectedPerDay - certMinutes);
    }

    return {
      id: e.id,
      date: e.date.toISOString(),
      clockIn: formatTime(e.clockIn),
      lunchOut: formatTime(e.lunchOut),
      lunchIn: formatTime(e.lunchIn),
      clockOut: formatTime(e.clockOut),
      workedMinutes: fullDayCert ? 0 : calcWorkedMinutes(e),
      expectedMinutes: expectedForEntry,
      rawClockIn: e.clockIn?.toISOString() ?? null,
      rawLunchOut: e.lunchOut?.toISOString() ?? null,
      rawLunchIn: e.lunchIn?.toISOString() ?? null,
      rawClockOut: e.clockOut?.toISOString() ?? null,
      holiday: holiday ? { name: holiday.name } : null,
      certificate: fullDayCert
        ? { type: "FULL_DAY" as const, startDate: fullDayCert.startDate?.toISOString() || null, endDate: fullDayCert.endDate?.toISOString() || null }
        : partialCert
          ? { type: "PARTIAL" as const, startTime: partialCert.startTime, endTime: partialCert.endTime }
          : null,
    };
  });

  const serializedAdjustments = adjustments.map((a) => ({
    id: a.id,
    minutes: a.minutes,
    reason: a.reason,
    managerName: a.manager.name,
    createdAt: a.createdAt.toISOString(),
  }));

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
        certificates={serializedCertificates}
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
