import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  minutes: z.number().int().refine((v) => v !== 0, "Não pode ser zero"),
  reason: z.string().min(3),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await await requireManager();
    const { minutes, reason } = schema.parse(await req.json());

    const employee = await prisma.user.findUnique({ where: { id: params.id } });
    if (!employee || employee.role !== "EMPLOYEE" || employee.managerId !== session.userId) return NextResponse.json({ error: "Funcionário não encontrado ou sem permissão" }, { status: 404 });

    const adjustment = await prisma.hourBankAdjustment.create({
      data: { userId: params.id, managerId: session.userId, minutes, reason },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "HOUR_BANK_ADJUSTMENT",
        targetUserId: params.id,
        details: { minutes, reason },
      },
    });

    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
