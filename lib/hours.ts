import { TimeEntry } from "@prisma/client";
import { getDay, differenceInMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parseDateFromAPI } from "@/lib/dates";

export function calcWorkedMinutes(entry: TimeEntry): number {
  if (!entry.clockIn || !entry.clockOut) return 0;

  let totalMinutes = differenceInMinutes(entry.clockOut, entry.clockIn);

  if (entry.lunchOut && entry.lunchIn) {
    const lunchMinutes = differenceInMinutes(entry.lunchIn, entry.lunchOut);
    totalMinutes -= lunchMinutes;
  }

  return Math.max(0, totalMinutes);
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

export function formatTime(date: Date | null | undefined): string {
  if (!date) return "--:--";
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
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

  const userWorkDays = user.workDays || [1, 2, 3, 4, 5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);
  
  let balanceMinutes = 0;

  for (const entry of entries) {
    const entryDate = parseDateFromAPI(entry.date.toISOString());
    const dayOfWeek = getDay(entryDate);
    
    if (!userWorkDays.includes(dayOfWeek)) continue;
    
    if (entry.clockIn && entry.lunchOut && entry.lunchIn && entry.clockOut) {
      const worked = calcWorkedMinutes(entry);
      balanceMinutes += worked - expectedPerDay;
    }
  }

  for (const adj of adjustments) {
    balanceMinutes += adj.minutes;
  }

  return balanceMinutes;
}
