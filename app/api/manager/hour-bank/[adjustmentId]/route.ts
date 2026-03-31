import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const patchSchema = z.object({
  minutes: z.number().int().refine((v) => v !== 0, "Não pode ser zero"),
  reason: z.string().min(3),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { adjustmentId: string } }
) {
  try {
    const session = await requireManager();
    const body = await req.json();
    const { minutes, reason } = patchSchema.parse(body);

    const adjustment = await prisma.hourBankAdjustment.findUnique({
      where: { id: params.adjustmentId },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Ajuste não encontrado" }, { status: 404 });
    }

    const updated = await prisma.hourBankAdjustment.update({
      where: { id: params.adjustmentId },
      data: { minutes, reason },
    });

    await createAuditLog({
      actorId: session.userId,
      action: "EDIT_HOUR_BANK_ADJUSTMENT",
      targetUserId: adjustment.userId,
      details: {
        adjustmentId: adjustment.id,
        oldMinutes: adjustment.minutes,
        newMinutes: minutes,
        oldReason: adjustment.reason,
        newReason: reason,
      },
    });

    return NextResponse.json({ adjustment: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { adjustmentId: string } }
) {
  try {
    const session = await requireManager();

    const adjustment = await prisma.hourBankAdjustment.findUnique({
      where: { id: params.adjustmentId },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Ajuste não encontrado" }, { status: 404 });
    }

    await prisma.hourBankAdjustment.delete({
      where: { id: params.adjustmentId },
    });

    await createAuditLog({
      actorId: session.userId,
      action: "DELETE_HOUR_BANK_ADJUSTMENT",
      targetUserId: adjustment.userId,
      details: {
        adjustmentId: adjustment.id,
        minutes: adjustment.minutes,
        reason: adjustment.reason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
