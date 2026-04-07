import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateManagerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const data = updateManagerSchema.parse(body);

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== params.id) {
        return NextResponse.json({ error: "E-mail já em uso" }, { status: 400 });
      }
    }

    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    
    const manager = await prisma.user.findUnique({ where: { id: params.id, role: "MANAGER" } });
    if (!manager) {
      return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { actorId: params.id },
            { targetUserId: params.id }
          ]
        }
      });

      await tx.hourBankAdjustment.deleteMany({
        where: { managerId: params.id }
      });

      await tx.timeEntry.deleteMany({
        where: { userId: params.id }
      });

      await tx.user.delete({
        where: { id: params.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
