import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkOverlap } from "@/lib/medical-certificates";
import { z } from "zod";

const partialUpdateSchema = z.object({
  type: z.literal("PARTIAL"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().optional(),
});

const fullDayUpdateSchema = z.object({
  type: z.literal("FULL_DAY"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

const updateSchema = z.discriminatedUnion("type", [partialUpdateSchema, fullDayUpdateSchema]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const cert = await prisma.medicalCertificate.findUnique({ where: { id: params.id } });
    if (!cert) return NextResponse.json({ error: "Atestado não encontrado" }, { status: 404 });

    // Permission: creator or manager
    if (session.role === "EMPLOYEE" && cert.createdById !== session.userId) {
      return NextResponse.json({ error: "Sem permissão para editar este atestado" }, { status: 403 });
    }

    if (session.role === "MANAGER") {
      const employee = await prisma.user.findUnique({ where: { id: cert.userId } });
      if (!employee || (employee.id !== session.userId && employee.managerId !== session.userId)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const today = new Date().toISOString().split("T")[0];

    if (data.type === "PARTIAL") {
      if (data.date > today) {
        return NextResponse.json({ error: "Data não pode ser futura" }, { status: 400 });
      }
      if (data.startTime >= data.endTime) {
        return NextResponse.json({ error: "Horário de fim deve ser após o início" }, { status: 400 });
      }

      const hasOverlap = await checkOverlap(cert.userId, "PARTIAL", {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        excludeId: cert.id,
      });
      if (hasOverlap) {
        return NextResponse.json({ error: "Já existe atestado nesse período" }, { status: 400 });
      }

      const updated = await prisma.medicalCertificate.update({
        where: { id: cert.id },
        data: {
          type: "PARTIAL",
          date: new Date(`${data.date}T00:00:00-03:00`),
          startDate: null,
          endDate: null,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason || null,
        },
      });

      await createAuditLog({
        actorId: session.userId,
        action: "MEDICAL_CERTIFICATE_UPDATED",
        targetUserId: cert.userId,
        details: { certificateId: cert.id, type: "PARTIAL", date: data.date, startTime: data.startTime, endTime: data.endTime },
      });

      return NextResponse.json({ certificate: updated });
    } else {
      if (data.startDate > today || data.endDate > today) {
        return NextResponse.json({ error: "Data não pode ser futura" }, { status: 400 });
      }
      if (data.endDate < data.startDate) {
        return NextResponse.json({ error: "Data fim deve ser igual ou após data início" }, { status: 400 });
      }

      const hasOverlap = await checkOverlap(cert.userId, "FULL_DAY", {
        startDate: data.startDate,
        endDate: data.endDate,
        excludeId: cert.id,
      });
      if (hasOverlap) {
        return NextResponse.json({ error: "Já existe atestado nesse período" }, { status: 400 });
      }

      const updated = await prisma.medicalCertificate.update({
        where: { id: cert.id },
        data: {
          type: "FULL_DAY",
          startDate: new Date(`${data.startDate}T00:00:00-03:00`),
          endDate: new Date(`${data.endDate}T00:00:00-03:00`),
          date: new Date(`${data.startDate}T00:00:00-03:00`),
          startTime: null,
          endTime: null,
          reason: data.reason || null,
        },
      });

      await createAuditLog({
        actorId: session.userId,
        action: "MEDICAL_CERTIFICATE_UPDATED",
        targetUserId: cert.userId,
        details: { certificateId: cert.id, type: "FULL_DAY", startDate: data.startDate, endDate: data.endDate },
      });

      return NextResponse.json({ certificate: updated });
    }
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
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const cert = await prisma.medicalCertificate.findUnique({ where: { id: params.id } });
    if (!cert) return NextResponse.json({ error: "Atestado não encontrado" }, { status: 404 });

    // Permission: creator or manager
    if (session.role === "EMPLOYEE" && cert.createdById !== session.userId) {
      return NextResponse.json({ error: "Sem permissão para remover este atestado" }, { status: 403 });
    }

    if (session.role === "MANAGER") {
      const employee = await prisma.user.findUnique({ where: { id: cert.userId } });
      if (!employee || (employee.id !== session.userId && employee.managerId !== session.userId)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }

    await prisma.medicalCertificate.delete({ where: { id: cert.id } });

    await createAuditLog({
      actorId: session.userId,
      action: "MEDICAL_CERTIFICATE_DELETED",
      targetUserId: cert.userId,
      details: {
        certificateId: cert.id,
        type: cert.type,
        ...(cert.type === "PARTIAL"
          ? { date: cert.date?.toISOString(), startTime: cert.startTime, endTime: cert.endTime }
          : { startDate: cert.startDate?.toISOString(), endDate: cert.endDate?.toISOString() }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
