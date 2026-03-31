import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  clockIn:  z.string().nullable().optional(),
  lunchOut: z.string().nullable().optional(),
  lunchIn:  z.string().nullable().optional(),
  clockOut: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } });
    if (!entry) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }

    if (entry.userId !== session.userId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const toDate = (s: string | null | undefined) => (s ? new Date(s) : null);

    const updated = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        clockIn:  body.clockIn  !== undefined ? toDate(body.clockIn)  : undefined,
        lunchOut: body.lunchOut !== undefined ? toDate(body.lunchOut) : undefined,
        lunchIn:  body.lunchIn  !== undefined ? toDate(body.lunchIn)  : undefined,
        clockOut: body.clockOut !== undefined ? toDate(body.clockOut) : undefined,
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
