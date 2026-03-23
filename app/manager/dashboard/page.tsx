import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calcWorkedMinutes,
  expectedDailyMinutes,
  formatMinutes,
} from "@/lib/hours";
import AppLayout from "@/components/AppLayout";
import ManagerDashboardClient from "./DashboardClient";

export default async function ManagerDashboard() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  const manager = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, weeklyHours: true, active: true, avatarUrl: true, overtimeMode: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!manager) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", active: true },
    orderBy: { name: "asc" },
  });

  const since90 = new Date(today);
  since90.setDate(since90.getDate() - 90);

  const employeeData = await Promise.all(
    employees.map(async (emp) => {
      const expectedPerDay = expectedDailyMinutes(emp.weeklyHours);

      const entries = await prisma.timeEntry.findMany({
        where: { userId: emp.id, date: { gte: since90 } },
      });

      const adjustments = await prisma.hourBankAdjustment.findMany({
        where: { userId: emp.id },
      });

      let balanceMinutes = 0;
      for (const entry of entries) {
        const dow = entry.date.getDay();
        if (dow === 0 || dow === 6) continue;
        balanceMinutes += calcWorkedMinutes(entry) - expectedPerDay;
      }
      for (const adj of adjustments) balanceMinutes += adj.minutes;

      const todayEntry = entries.find(
        (e) => e.date.toISOString().split("T")[0] === today.toISOString().split("T")[0]
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

  // Resumo
  const present = employeeData.filter((e) => e.todayStatus === "present").length;
  const incomplete = employeeData.filter((e) => e.todayStatus === "incomplete").length;
  const absent = employeeData.filter((e) => e.todayStatus === "absent").length;

  return (
    <AppLayout userName={manager.name} userRole="MANAGER" avatarUrl={manager.avatarUrl ?? undefined}>
      <ManagerDashboardClient
        employees={employeeData}
        summary={{ present, incomplete, absent, total: employees.length }}
        today={today.toISOString()}
      />
    </AppLayout>
  );
}
