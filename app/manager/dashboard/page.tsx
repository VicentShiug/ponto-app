import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcWorkedMinutes,
  expectedDailyMinutes,
  formatMinutes,
  calculateHourBankBalance,
} from "@/lib/hours";
import { getDay, subDays, startOfDayInZone, isSameDay, formatDateISO, parseDateFromAPI, getYear } from "@/lib/dates";
import { getHolidays, isHoliday } from "@/lib/holidays";
import AppLayout from "@/components/AppLayout";
import ManagerDashboardClient from "./DashboardClient";

export default async function ManagerDashboard() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const manager = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!manager) redirect("/login");

  const now = new Date();
  const today = startOfDayInZone(now);
  const year = getYear(today);

  const [holidaysCurrent, holidaysNext] = await Promise.all([
    getHolidays(year),
    getHolidays(year + 1),
  ]);
  const holidays = [...holidaysCurrent, ...holidaysNext];
  const todayHoliday = isHoliday(today, holidays);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", active: true, managerId: session.userId },
    orderBy: { name: "asc" },
  });

  const since90 = subDays(today, 90);

  const employeeData = await Promise.all(
    employees.map(async (emp) => {
      const expectedPerDay = expectedDailyMinutes(emp.weeklyHours);

      const entries = await prisma.timeEntry.findMany({
        where: { userId: emp.id, date: { gte: since90 } },
      });

      const balanceMinutes = await calculateHourBankBalance(emp.id);

      const todayEntry = entries.find(
        (e) => isSameDay(parseDateFromAPI(e.date.toISOString()), today)
      );

      let todayStatus: "present" | "absent" | "incomplete" = "absent";
      if (todayEntry?.clockOut) todayStatus = "present";
      else if (todayEntry?.clockIn) todayStatus = "incomplete";

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        weeklyHours: emp.weeklyHours,
        overtimeMode: emp.overtimeMode,
        balanceMinutes,
        balanceLabel: formatMinutes(balanceMinutes),
        todayStatus,
      };
    })
  );

  const present = employeeData.filter((e) => e.todayStatus === "present").length;
  const incomplete = employeeData.filter((e) => e.todayStatus === "incomplete").length;
  const absent = employeeData.filter((e) => e.todayStatus === "absent").length;

  return (
    <AppLayout userName={manager.name} userRole="MANAGER" avatarUrl={manager.avatarUrl ?? undefined}>
      <ManagerDashboardClient
        employees={employeeData}
        summary={{ present, incomplete, absent, total: employees.length }}
        today={today.toISOString().slice(0, 10)}
        todayHoliday={todayHoliday ? { name: todayHoliday.name } : null}
      />
    </AppLayout>
  );
}
