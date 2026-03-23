import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["clock_in", "lunch_out", "lunch_in", "clock_out", "skip_lunch"]),
  entryId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { action, entryId } = schema.parse(await req.json());

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

    const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
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
    }

    const updated = await prisma.timeEntry.update({ where: { id: entryId }, data: update });
    return NextResponse.json({ entry: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    if ((err as Error).message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
