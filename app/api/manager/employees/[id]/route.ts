import { NextRequest, NextResponse } from "next/server";
import { requireManager, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  weeklyHours: z.coerce.number().min(1).max(60).optional(),
  overtimeMode: z.enum(["HOUR_BANK", "OVERTIME"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await await requireManager();
    const body = patchSchema.parse(await req.json());

    const before = await prisma.user.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.password) updateData.passwordHash = await hashPassword(body.password);
    if (body.weeklyHours !== undefined) updateData.weeklyHours = body.weeklyHours;
    if (body.overtimeMode) updateData.overtimeMode = body.overtimeMode;
    if (body.active !== undefined) updateData.active = body.active;

    const user = await prisma.user.update({ where: { id: params.id }, data: updateData });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "UPDATE_EMPLOYEE",
        targetUserId: user.id,
        details: {
          before: {
            name: before.name, email: before.email,
            weeklyHours: before.weeklyHours, overtimeMode: before.overtimeMode, active: before.active,
          },
          after: updateData,
        },
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    if ((err as Error).message === "Acesso negado") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
