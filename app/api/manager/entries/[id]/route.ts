import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clockIn: z.string().nullable().optional(),
  lunchOut: z.string().nullable().optional(),
  lunchIn: z.string().nullable().optional(),
  clockOut: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await await requireManager();
    const body = schema.parse(await req.json());

    const entry = await prisma.timeEntry.findUnique({ where: { id: params.id }, include: { user: { select: { role: true, managerId: true } } } });
    if (!entry || entry.user.role !== "EMPLOYEE" || entry.user.managerId !== session.userId) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });

    const toDate = (s: string | null | undefined) => (s ? new Date(s) : null);

    const before = {
      clockIn: entry.clockIn, lunchOut: entry.lunchOut,
      lunchIn: entry.lunchIn, clockOut: entry.clockOut,
    };

    const updated = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        clockIn:  body.clockIn  !== undefined ? toDate(body.clockIn)  : undefined,
        lunchOut: body.lunchOut !== undefined ? toDate(body.lunchOut) : undefined,
        lunchIn:  body.lunchIn  !== undefined ? toDate(body.lunchIn)  : undefined,
        clockOut: body.clockOut !== undefined ? toDate(body.clockOut) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "EDIT_TIME_ENTRY",
        targetUserId: entry.userId,
        details: { entryId: params.id, before, after: body },
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
