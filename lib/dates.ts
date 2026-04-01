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

export const TIMEZONE = "America/Sao_Paulo";
const SP_OFFSET = 3 * 60 * 60 * 1000;

export const toSP = (date: Date) => new Date(date.getTime() - SP_OFFSET);


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

export function parseZonedStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

export function parseZonedEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59-03:00`);
}

export function startOfDayInZone(date: Date): Date {
  return new Date(`${formatDateISO(date)}T00:00:00-03:00`);
}

export function parseTime(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = startOfDay(baseDate);
  return addMinutes(addHours(date, hours), minutes);
}

export function formatDate(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatTime(date: Date | null | undefined): string {
  if (!date) return "--:--";
  const d = toSP(date);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function getDaySP(date: Date): number {
  return date.getUTCDay();
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
  format
};
