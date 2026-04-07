import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcWorkedMinutes, expectedDailyMinutes, calculateHourBankBalance } from "@/lib/hours";
import { getDaySP, parseZonedStart, parseZonedEnd, formatDate, formatTime } from "@/lib/dates";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireManager();
    const { searchParams } = req.nextUrl;
    const ids = searchParams.get("ids")?.split(",") ?? [];
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!ids.length || !start || !end) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const parsedStart = parseZonedStart(start!);
    const parsedEnd = parseZonedEnd(end!);


    const results = await Promise.all(
      ids.map(async (id) => {
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, weeklyHours: true, workDays: true, overtimeMode: true, role: true, managerId: true } });
        if (!user || user.role !== "EMPLOYEE" || user.managerId !== session.userId) return null;

        const entries = await prisma.timeEntry.findMany({
          where: { userId: id, date: { gte: parsedStart, lte: parsedEnd } },
          orderBy: { date: "asc" },
        });

        const userWorkDays = user.workDays || [1,2,3,4,5];
        const expectedPerDay = expectedDailyMinutes(user.weeklyHours, userWorkDays);

        const balanceMinutes = await calculateHourBankBalance(id);
        const serialized = entries.map((e) => {
          const dow = getDaySP(e.date);
          const worked = calcWorkedMinutes(e);
          const has4 = e.clockIn && e.lunchOut && e.lunchIn && e.clockOut;
          const diff = (!userWorkDays.includes(dow) || !has4) ? 0 : worked - expectedPerDay;
          return {
            date: formatDate(e.date),
            weekday: WEEKDAYS[dow],
            clockIn: formatTime(e.clockIn),
            lunchOut: formatTime(e.lunchOut),
            lunchIn: formatTime(e.lunchIn),
            clockOut: formatTime(e.clockOut),
            workedMinutes: worked,
            diff,
          };

        });

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
