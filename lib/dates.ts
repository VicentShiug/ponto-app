import { 
  parse,
  format,
  getDay,
  getDate,
  getMonth,
  getYear,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addHours,
  addMinutes,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isSameDay,
  isAfter,
  isBefore,
  differenceInMinutes,
  isValid
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const TIMEZONE = "America/Sao_Paulo";

export function parseDate(dateStr: string): Date {
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  if (!isValid(parsed)) {
    throw new Error(`Data inválida: ${dateStr}`);
  }
  return parsed;
}

export function parseDateFromAPI(isoString: string): Date {
  const dateOnly = isoString.slice(0, 10);
  return parse(dateOnly, "yyyy-MM-dd", new Date());
}

export function startOfDayInZone(date: Date, timeZone: string = TIMEZONE): Date {
  const zonedDate = toZonedTime(date, timeZone);
  return fromZonedTime(startOfDay(zonedDate), timeZone);
}

export function parseTime(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = startOfDay(baseDate);
  return addMinutes(addHours(date, hours), minutes);
}

export function formatDate(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatTime(date: Date | null | undefined): string {
  if (!date) return "--:--";
  return format(date, "HH:mm");
}

export {
  getDay,
  getDate,
  getMonth,
  getYear,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addHours,
  addMinutes,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isSameDay,
  isAfter,
  isBefore,
  differenceInMinutes,
  toZonedTime,
  fromZonedTime,
  format
};
