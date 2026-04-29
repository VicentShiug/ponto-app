import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, calculateHourBankBalance } from "@/lib/hours";
import { getDaySP, parseZonedStart, parseZonedEnd, formatDate, formatTime, formatDateISO } from "@/lib/dates";
import { getHolidays, isHoliday } from "@/lib/holidays";
import { getCertificatesForDateRange, getFullDayCertificateForDate, getPartialCertificateForDate, getPartialCertificateMinutes } from "@/lib/medical-certificates";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireManager();
    const { searchParams } = req.nextUrl;
    const ids = searchParams.get("ids")?.split(",") ?? [];
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!ids.length || !start || !end) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const parsedStart = parseZonedStart(start!);
    const parsedEnd = parseZonedEnd(end!);

    // Fetch holidays for the range
    const startYear = parsedStart.getFullYear();
    const endYear = parsedEnd.getFullYear();
    const yearsSet = new Set<number>();
    for (let y = startYear; y <= endYear; y++) yearsSet.add(y);
    const holidayLists = await Promise.all(Array.from(yearsSet).map(getHolidays));
    const holidays = holidayLists.flat();

    const results = await Promise.all(
      ids.map(async (id) => {
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, weeklyHours: true, workDays: true, overtimeMode: true, role: true, managerId: true } });
        if (!user || user.role !== "EMPLOYEE" || user.managerId !== session.userId) return null;

        const entries = await prisma.timeEntry.findMany({
          where: { userId: id, date: { gte: parsedStart, lte: parsedEnd } },
          orderBy: { date: "asc" },
        });

        // Fetch certificates
        const certificates = await getCertificatesForDateRange(id, parsedStart, parsedEnd);

        const userWorkDays = user.workDays || [1,2,3,4,5];
        const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);

        const balanceMinutes = await calculateHourBankBalance(id);
        const serialized = entries.map((e) => {
          const dow = getDaySP(e.date);
          const dateISO = formatDateISO(e.date);
          const holiday = isHoliday(e.date, holidays);
          const fullDayCert = getFullDayCertificateForDate(dateISO, certificates);
          const partialCert = getPartialCertificateForDate(dateISO, certificates);

          const worked = fullDayCert ? 0 : calcWorkedMinutes(e);
          const has4 = e.clockIn && e.lunchOut && e.lunchIn && e.clockOut;

          let diff = 0;
          let tipo = "";

          if (fullDayCert) {
            diff = 0;
            if (holiday) {
              tipo = "Feriado / Atestado";
            } else {
              tipo = "Atestado Integral";
            }
          } else if (partialCert) {
            const certMinutes = getPartialCertificateMinutes(partialCert);
            const adjustedExpected = Math.max(0, expectedPerDay - certMinutes);
            diff = has4 ? worked - adjustedExpected : 0;
            tipo = `Atestado Parcial (${partialCert.startTime}–${partialCert.endTime})`;
          } else if (holiday) {
            diff = has4 ? worked : 0;
            tipo = "Feriado";
          } else {
            diff = (!userWorkDays.includes(dow) || !has4) ? 0 : worked - expectedPerDay;
          }

          return {
            date: formatDate(e.date),
            weekday: WEEKDAYS[dow],
            clockIn: formatTime(e.clockIn),
            lunchOut: formatTime(e.lunchOut),
            lunchIn: formatTime(e.lunchIn),
            clockOut: formatTime(e.clockOut),
            workedMinutes: worked,
            diff,
            tipo,
          };
        });

        return {
          employeeId: id,
          employeeName: user.name,
          weeklyHours: user.weeklyHours,
          overtimeMode: user.overtimeMode,
          balanceMinutes,
          entries: serialized,
        };
      })
    );

    return NextResponse.json(results.filter(Boolean));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
