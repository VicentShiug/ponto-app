import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseDate, parseTime, addHours, addMinutes, startOfDay } from "@/lib/dates";

const importSchema = z.object({
  employeeId: z.string().optional(),
  rows: z.array(z.object({
    date: z.string(),
    clockIn: z.string().nullable(),
    lunchOut: z.string().nullable(),
    lunchIn: z.string().nullable(),
    clockOut: z.string().nullable(),
    workedHours: z.number(),
    description: z.string(),
    isEmptyDay: z.boolean(),
  })),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = importSchema.parse(body);

    let targetUserId = session.userId;
    let targetEmployeeName: string | undefined = undefined;

    if (session.role === "MANAGER") {
      if (!data.employeeId) {
        return NextResponse.json({ error: "Selecione um funcionário" }, { status: 400 });
      }

      const targetEmployee = await prisma.user.findFirst({
        where: {
          id: data.employeeId,
          role: "EMPLOYEE"
        }
      });

      if (!targetEmployee) {
        return NextResponse.json({ error: "Funcionário inválido ou não encontrado" }, { status: 400 });
      }

      targetUserId = targetEmployee.id;
      targetEmployeeName = targetEmployee.name;
    }

    const imported: number[] = [];
    const ignored: string[] = [];
    const errors: string[] = [];

    for (const row of data.rows) {
      try {
        const date = parseDate(row.date);
        
        if (row.isEmptyDay) {
          await prisma.timeEntry.upsert({
            where: {
              userId_date: {
                userId: targetUserId,
                date,
              },
            },
            create: {
              userId: targetUserId,

              date,
              notes: row.description || null,
            },
            update: {
              notes: row.description || null,
            },
          });
          imported.push(1);
        } else {
          const updateData: {
            notes: string | null;
            clockIn?: Date;
            lunchOut?: Date | null;
            lunchIn?: Date | null;
            clockOut?: Date | null;
          } = {
            notes: row.description || null,
          };

          if (row.clockIn) {
            updateData.clockIn = parseTime(row.clockIn, date);
          }
          if (row.lunchOut) {
            updateData.lunchOut = parseTime(row.lunchOut, date);
          } else {
            updateData.lunchOut = null;
          }
          if (row.lunchIn) {
            updateData.lunchIn = parseTime(row.lunchIn, date);
          } else {
            updateData.lunchIn = null;
          }
          if (row.clockOut) {
            updateData.clockOut = parseTime(row.clockOut, date);
          } else {
            updateData.clockOut = null;
          }

          await prisma.timeEntry.upsert({
            where: {
              userId_date: {
                userId: targetUserId,
                date,
              },
            },
            create: {
              userId: targetUserId,

              date,
              ...updateData,
            },
            update: updateData,
          });
          imported.push(1);
        }
      } catch (err) {
        const dateStr = row.date;
        errors.push(`Erro ao importar ${dateStr}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      importados: imported.length,
      ignorados: ignored.length,
      erros: errors,
      employeeName: targetEmployeeName,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if ((err as Error).message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
