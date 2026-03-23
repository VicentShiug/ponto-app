import { NextRequest, NextResponse } from "next/server";
import { requireSession, hashPassword, comparePassword, signToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name:         z.string().min(2).optional(),
  weeklyHours:  z.number().min(1).max(60).optional(),
  workDays:     z.array(z.number().min(0).max(6)).optional(),
  currentPassword: z.string().optional(),
  newPassword:  z.string().min(6).optional(),
  avatarUrl:    z.string().nullable().optional(),
  accentColor:  z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, weeklyHours: true, workDays: true, role: true, avatarUrl: true, accentColor: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = patchSchema.parse(await req.json());

    const current = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!current) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const updateData: Record<string, unknown> = {};

    if (body.name)        updateData.name       = body.name;
    if (body.accentColor) updateData.accentColor = body.accentColor;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

    // Only employees can change weeklyHours and workDays via profile
    if (body.weeklyHours !== undefined && current.role === "EMPLOYEE") {
      updateData.weeklyHours = body.weeklyHours;
    }
    if (body.workDays !== undefined && current.role === "EMPLOYEE") {
      updateData.workDays = body.workDays;
    }

    // Password change
    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: "Senha atual obrigatória" }, { status: 400 });
      }
      const valid = await comparePassword(body.currentPassword, current.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(body.newPassword);
    }

    const user = await prisma.user.update({ where: { id: session.userId }, data: updateData });

    // Re-issue token if name changed
    if (body.name) {
      const token = await signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      await setSessionCookie(token);
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, weeklyHours: user.weeklyHours, workDays: user.workDays, avatarUrl: user.avatarUrl, accentColor: user.accentColor },
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
