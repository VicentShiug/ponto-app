import { TimeEntry } from "@prisma/client";
import { getDay, differenceInMinutes } from "date-fns";

export function calcWorkedMinutes(entry: TimeEntry): number {
  if (!entry.clockIn || !entry.clockOut) return 0;

  const totalMs = entry.clockOut.getTime() - entry.clockIn.getTime();
  let totalMinutes = Math.floor(totalMs / 60000);

  if (entry.lunchOut && entry.lunchIn) {
    const lunchMs = entry.lunchIn.getTime() - entry.lunchOut.getTime();
    totalMinutes -= Math.floor(lunchMs / 60000);
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
