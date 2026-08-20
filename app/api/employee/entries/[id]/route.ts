import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const extraEntrySchema = z.object({
  id: z.string().optional(),
  returnTime: z.string().nullable(),
  exitTime: z.string().nullable(),
  order: z.number(),
});

const schema = z.object({
  clockIn:  z.string().nullable().optional(),
  lunchOut: z.string().nullable().optional(),
  lunchIn:  z.string().nullable().optional(),
  clockOut: z.string().nullable().optional(),
  extraEntries: z.array(extraEntrySchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    const entry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
      include: { extraEntries: { orderBy: { order: "asc" } } },
    });
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

    // Processar extras se enviados
    if (body.extraEntries !== undefined) {
      const existingIds = entry.extraEntries.map(e => e.id);
      const sentIds = body.extraEntries.filter(e => e.id).map(e => e.id!);

      // Deletar extras removidos
      const toDelete = existingIds.filter(id => !sentIds.includes(id));
      if (toDelete.length > 0) {
        await prisma.extraTimeEntry.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Atualizar ou criar extras
      for (const extra of body.extraEntries) {
        if (extra.id && existingIds.includes(extra.id)) {
          // Atualizar existente
          await prisma.extraTimeEntry.update({
            where: { id: extra.id },
            data: {
              returnTime: extra.returnTime ? new Date(extra.returnTime) : undefined,
              exitTime: extra.exitTime ? new Date(extra.exitTime) : null,
              order: extra.order,
            },
          });
        } else if (extra.returnTime) {
          // Criar novo
          await prisma.extraTimeEntry.create({
            data: {
              timeEntryId: params.id,
              returnTime: new Date(extra.returnTime),
              exitTime: extra.exitTime ? new Date(extra.exitTime) : null,
              order: extra.order,
            },
          });
        }
      }
    }

    const result = await prisma.timeEntry.findUnique({
      where: { id: params.id },
      include: { extraEntries: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ entry: result });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    
    const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } });
    if (!entry) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }

    if (entry.userId !== session.userId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Extras são deletados em cascata (onDelete: Cascade)
    await prisma.timeEntry.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
