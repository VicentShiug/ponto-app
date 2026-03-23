import { TimeEntry } from "@prisma/client";

/**
 * Calcula minutos trabalhados em um registro de ponto.
 * Todos os cálculos em minutos para evitar erros de ponto flutuante.
 */
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

/**
 * Converte minutos para string formatada "Xh Ym"
 */
export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

/**
 * Converte minutos para horas decimais
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Calcula horas esperadas por dia com base na carga semanal
 */
export function expectedDailyMinutes(weeklyHours: number): number {
  return Math.floor((weeklyHours * 60) / 5);
}

/**
 * Formata hora de um Date para "HH:mm"
 */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/**
 * Formata data para "dd/MM/yyyy"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/**
 * Formata data curta para "dd/MM"
 */
export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/**
 * Nome do dia da semana abreviado
 */
export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/**
 * Retorna o status de um registro de ponto
 */
export type EntryStatus = "complete" | "incomplete" | "absent" | "weekend";

export function getEntryStatus(
  entry: TimeEntry | null,
  date: Date
): EntryStatus {
  const day = date.getDay();
  if (day === 0 || day === 6) return "weekend";
  if (!entry) return "absent";
  if (entry.clockIn && entry.clockOut) return "complete";
  return "incomplete";
}
