import { prisma } from "@/lib/prisma";
import { getDay } from "date-fns";
import { parseDateFromAPI } from "@/lib/dates";
import { calcWorkedMinutes, expectedDailyMinutes } from "@/lib/hours";

/**
 * Calculates the dynamic hour bank balance for a user.
 * It sums the manual adjustments and the calculated deltas
 * between worked hours and expected daily hours for complete records.
 */
export async function calculateDynamicBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyHours: true, workDays: true },
  });

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const entries = await prisma.timeEntry.findMany({
    where: { userId },
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId },
  });

  const userWorkDays = user.workDays || [1, 2, 3, 4, 5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);
  let balanceMinutes = 0;

  for (const entry of entries) {
    const dayOfWeek = getDay(parseDateFromAPI(entry.date.toISOString()));

    // Check if it's a workday
    if (!userWorkDays.includes(dayOfWeek)) continue;

    // We only calculate delta if the entry is complete
    // The business rule mentioned: "TimeEntry completo (entrada + almoço + volta + saída)"
    // As implemented in getEntryStatus, complete means having at least clockIn and clockOut
    if (entry.clockIn && entry.clockOut) {
      const worked = calcWorkedMinutes(entry);
      balanceMinutes += worked - expectedPerDay;
    }
  }

  // Add the manual manager adjustments
  for (const adj of adjustments) {
    balanceMinutes += adj.minutes;
  }

  return balanceMinutes;
}

export interface Outlier {
  dateLabel: string;
  deltaMinutes: number;
}

export interface MonthlyBankData {
  monthKey: string;
  monthLabel: string;
  balanceMinutes: number;
  daysWorked: number;
  outliers: Outlier[];
}

export interface HourBankDetails {
  totalBalance: number;
  currentMonthBalance: number;
  totalAdjustments: number;
  monthlyData: MonthlyBankData[];
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export async function getHourBankDetails(userId: string): Promise<HourBankDetails> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyHours: true, workDays: true },
  });

  if (!user) throw new Error("Usuário não encontrado");

  const entries = await prisma.timeEntry.findMany({
    where: { userId },
    orderBy: { date: "asc" }
  });

  const adjustments = await prisma.hourBankAdjustment.findMany({
    where: { userId },
  });

  const userWorkDays = user.workDays || [1, 2, 3, 4, 5];
  const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);
  
  let totalBalance = 0;
  let totalAdjustments = 0;
  let currentMonthBalance = 0;
  
  const monthlyMap: Record<string, MonthlyBankData> = {};

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const entry of entries) {
    const entryDate = parseDateFromAPI(entry.date.toISOString());
    const dayOfWeek = getDay(entryDate);
    
    if (!userWorkDays.includes(dayOfWeek)) continue;
    
    if (entry.clockIn && entry.lunchOut && entry.lunchIn && entry.clockOut) {
      const worked = calcWorkedMinutes(entry);
      const delta = worked - expectedPerDay;
      totalBalance += delta;

      const year = entryDate.getFullYear();
      const month = entryDate.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          monthLabel: `${MONTHS[month]} ${year}`,
          balanceMinutes: 0,
          daysWorked: 0,
          outliers: []
        };
      }

      monthlyMap[monthKey].balanceMinutes += delta;
      monthlyMap[monthKey].daysWorked += 1;

      if (Math.abs(delta) > 30) {
        monthlyMap[monthKey].outliers.push({
          dateLabel: `${String(entryDate.getDate()).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}`,
          deltaMinutes: delta
        });
      }

      if (monthKey === currentMonthKey) {
        currentMonthBalance += delta;
      }
    }
  }

  for (const adj of adjustments) {
    totalBalance += adj.minutes;
    totalAdjustments += adj.minutes;
    
    const adjDate = new Date(adj.createdAt);
    const monthKey = `${adjDate.getFullYear()}-${String(adjDate.getMonth() + 1).padStart(2, "0")}`;
    if (monthKey === currentMonthKey) {
      currentMonthBalance += adj.minutes;
    }
  }

  const monthlyList = Object.values(monthlyMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return {
    totalBalance,
    currentMonthBalance,
    totalAdjustments,
    monthlyData: monthlyList,
  };
}
