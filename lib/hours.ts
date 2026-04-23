import { TimeEntry } from "@prisma/client";
import { getDay, differenceInMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parseDateFromAPI } from "@/lib/dates";
import { getHolidays, isHoliday } from "@/lib/holidays";

export function calcWorkedMinutes(entry: { clockIn?: Date | null; lunchOut?: Date | null; lunchIn?: Date | null; clockOut?: Date | null; }): number {
  if (!entry.clockIn) return 0;
  let totalMin = 0;

  if (entry.clockOut && !entry.lunchOut && !entry.lunchIn) {
    return differenceInMinutes(entry.clockOut, entry.clockIn);
  }

  if (entry.lunchOut) {
    totalMin += differenceInMinutes(entry.lunchOut, entry.clockIn);
  }

  if (entry.lunchIn && entry.clockOut) {
    totalMin += differenceInMinutes(entry.clockOut, entry.lunchIn);
  }

  return Math.max(0, totalMin);
}

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function expectedDailyMinutes(weeklyHours: number, workDays: number[] = [1,2,3,4,5]): number {
  const days = workDays.length || 5;
  return Math.floor((weeklyHours * 60) / days);
}

export function formatDecimalHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

const SP_OFFSET_MS = 3 * 60 * 60 * 1000; // America/Sao_Paulo = UTC-3

export function formatTime(date: Date | null | undefined): string {
  if (!date) return "--:--";
  // Converte UTC → horário de Brasília antes de extrair horas/minutos
  const sp = new Date(date.getTime() - SP_OFFSET_MS);
  const hours = sp.getUTCHours().toString().padStart(2, "0");
  const minutes = sp.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateShort(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

export function formatWeekday(date: Date): string {
  const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return weekdays[getDay(date)];
}

export type EntryStatus = "complete" | "incomplete" | "absent" | "weekend";

export function getEntryStatus(
  entry: TimeEntry | null,
  date: Date
): EntryStatus {
  const day = getDay(date);
  if (day === 0 || day === 6) return "weekend";
  if (!entry) return "absent";
  if (entry.clockIn && entry.clockOut) return "complete";
  return "incomplete";
}

export async function calculateHourBankBalance(
  userId: string,
  options?: { start?: Date; end?: Date }
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyHours: true, workDays: true },
  });

  if (!user) throw new Error("Usuário não encontrado");

  const dateFilter = options?.start || options?.end ? {
    ...(options.start ? { gte: options.start } : {}),
    ...(options.end ? { lte: options.end } : {}),
  } : undefined;

  const entries = await prisma.timeEntry.findMany({
    where: { 
      userId,
      ...(dateFilter ? { date: dateFilter } : {})
    },
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { 
      userId,
      ...(dateFilter ? { createdAt: dateFilter } : {})
    },
  });

  // Fetch medical certificates
  const { getCertificatesForDateRange, getFullDayCertificateForDate, getPartialCertificateForDate, getPartialCertificateMinutes, getFullDayDates } = await import("@/lib/medical-certificates");
  
  const allDates = entries.map(e => parseDateFromAPI(e.date.toISOString()));
  let certStart = options?.start || (allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date());
  let certEnd = options?.end || (allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date());
  const certificates = await getCertificatesForDateRange(userId, certStart, certEnd);

  const userWorkDays = user.workDays || [1, 2, 3, 4, 5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);
  
  let balanceMinutes = 0;

  const years = Array.from(new Set(entries.map(e => parseDateFromAPI(e.date.toISOString()).getFullYear())));
  const holidayLists = await Promise.all(years.map(getHolidays));
  const holidays = holidayLists.flat();

  const fullDayDates = getFullDayDates(certificates);

  for (const entry of entries) {
    const entryDate = parseDateFromAPI(entry.date.toISOString());
    const entryDateISO = entryDate.toISOString().split("T")[0];
    const dayOfWeek = getDay(entryDate);
    const holiday = isHoliday(entryDate, holidays);
    
    if (!userWorkDays.includes(dayOfWeek) && !holiday) continue;

    // FULL_DAY certificate → delta = 0, skip
    if (fullDayDates.has(entryDateISO)) continue;
    
    if (entry.clockIn) {
      const worked = calcWorkedMinutes(entry);
      
      // PARTIAL certificate → reduce expected
      const partialCert = getPartialCertificateForDate(entryDateISO, certificates);
      
      if (holiday) {
        balanceMinutes += worked;
      } else if (partialCert) {
        const certMinutes = getPartialCertificateMinutes(partialCert);
        const adjustedExpected = Math.max(0, expectedPerDay - certMinutes);
        balanceMinutes += worked - adjustedExpected;
      } else {
        balanceMinutes += worked - expectedPerDay;
      }
    }
  }

  for (const adj of adjustments) {
    balanceMinutes += adj.minutes;
  }

  return balanceMinutes;
}
