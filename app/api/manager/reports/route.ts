import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes } from "@/lib/hours";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmt(d: Date | null | undefined) {
  if (!d) return "--:--";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export async function GET(req: NextRequest) {
  try {
    await requireManager();
    const { searchParams } = req.nextUrl;
    const ids = searchParams.get("ids")?.split(",") ?? [];
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!ids.length || !start || !end) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T23:59:59");

    const results = await Promise.all(
      ids.map(async (id) => {
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, weeklyHours: true, workDays: true, overtimeMode: true } });
        if (!user) return null;

        const entries = await prisma.timeEntry.findMany({
          where: { userId: id, date: { gte: startDate, lte: endDate } },
          orderBy: { date: "asc" },
        });

        const userWorkDays = user.workDays || [1,2,3,4,5];
        const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);

        const adjustments = await prisma.hourBankAdjustment.findMany({ where: { userId: id } });
        
        let balanceMinutes = 0;
        const serialized = entries.map((e) => {
          const dow = e.date.getDay();
          const worked = calcWorkedMinutes(e);
          const diff = !userWorkDays.includes(dow) ? 0 : worked - expectedPerDay;
          balanceMinutes += diff;
          return {
            date: e.date.toLocaleDateString("pt-BR"),
            weekday: WEEKDAYS[dow],
            clockIn: fmt(e.clockIn),
            lunchOut: fmt(e.lunchOut),
            lunchIn: fmt(e.lunchIn),
            clockOut: fmt(e.clockOut),
            workedMinutes: worked,
            diff,
          };
        });

        for (const adj of adjustments) balanceMinutes += adj.minutes;

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
