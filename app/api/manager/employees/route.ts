import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  weeklyHours: z.coerce.number().min(1).max(60),
  overtimeMode: z.enum(["HOUR_BANK", "OVERTIME"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await await requireManager();
    const body = createSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 400 });

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        weeklyHours: body.weeklyHours,
        overtimeMode: body.overtimeMode,
        role: "EMPLOYEE",
        managerId: session.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: "CREATE_EMPLOYEE",
        targetUserId: user.id,
        details: { name: user.name, email: user.email },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    if ((err as Error).message === "Acesso negado") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
