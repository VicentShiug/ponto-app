import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDayInZone } from "@/lib/dates";

const schema = z.object({
  action: z.enum(["clock_in", "lunch_out", "lunch_in", "clock_out", "skip_lunch", "extra_return", "extra_exit"]),
  entryId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { action, entryId } = schema.parse(await req.json());

    const now = new Date();
    const today = startOfDayInZone(now);

    if (action === "clock_in") {
      const existing = await prisma.timeEntry.findUnique({
        where: { userId_date: { userId: session.userId, date: today } },
      });
      if (existing?.clockIn) {
        return NextResponse.json({ error: "Entrada já registrada hoje" }, { status: 400 });
      }
      const entry = await prisma.timeEntry.upsert({
        where: { userId_date: { userId: session.userId, date: today } },
        create: { userId: session.userId, date: today, clockIn: now },
        update: { clockIn: now },
      });
      return NextResponse.json({ entry });
    }

    if (!entryId) {
      return NextResponse.json({ error: "ID do registro não informado" }, { status: 400 });
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: { extraEntries: { orderBy: { order: "asc" } } },
    });
    if (!entry || entry.userId !== session.userId) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }

    let update: Record<string, Date | null> = {};

    if (action === "lunch_out") {
      if (!entry.clockIn) return NextResponse.json({ error: "Entrada não registrada" }, { status: 400 });
      update = { lunchOut: now };
    } else if (action === "lunch_in") {
      if (!entry.lunchOut) return NextResponse.json({ error: "Saída para almoço não registrada" }, { status: 400 });
      update = { lunchIn: now };
    } else if (action === "clock_out") {
      if (!entry.clockIn) return NextResponse.json({ error: "Entrada não registrada" }, { status: 400 });
      update = { clockOut: now };
    } else if (action === "skip_lunch") {
      // Pula almoço, vai direto para saída disponível
      update = { lunchOut: null, lunchIn: null };
    } else if (action === "extra_return") {
      // Volta ao trabalho após clockOut (ou após última saída extra)
      if (!entry.clockOut) {
        return NextResponse.json({ error: "Saída não registrada" }, { status: 400 });
      }
      // Verificar que não há extra pendente (sem exitTime = ainda trabalhando)
      const pendingExtra = entry.extraEntries.find(e => !e.exitTime);
      if (pendingExtra) {
        return NextResponse.json({ error: "Já existe uma volta sem saída registrada" }, { status: 400 });
      }
      const nextOrder = entry.extraEntries.length + 1;
      const extraEntry = await prisma.extraTimeEntry.create({
        data: {
          timeEntryId: entryId,
          returnTime: now,
          order: nextOrder,
        },
      });
      const updatedEntry = await prisma.timeEntry.findUnique({
        where: { id: entryId },
        include: { extraEntries: { orderBy: { order: "asc" } } },
      });
      return NextResponse.json({ entry: updatedEntry });
    } else if (action === "extra_exit") {
      // Saída extra — empregado sai novamente
      if (!entry.clockOut) {
        return NextResponse.json({ error: "Saída não registrada" }, { status: 400 });
      }
      const pendingExtra = entry.extraEntries.find(e => !e.exitTime);
      if (!pendingExtra) {
        return NextResponse.json({ error: "Nenhuma volta pendente para registrar saída" }, { status: 400 });
      }
      await prisma.extraTimeEntry.update({
        where: { id: pendingExtra.id },
        data: { exitTime: now },
      });
      const updatedEntry = await prisma.timeEntry.findUnique({
        where: { id: entryId },
        include: { extraEntries: { orderBy: { order: "asc" } } },
      });
      return NextResponse.json({ entry: updatedEntry });
    }

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: update,
      include: { extraEntries: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ entry: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    if ((err as Error).message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
