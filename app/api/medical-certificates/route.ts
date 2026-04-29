import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkOverlap } from "@/lib/medical-certificates";
import { z } from "zod";

const partialSchema = z.object({
  type: z.literal("PARTIAL"),
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().optional(),
});

const fullDaySchema = z.object({
  type: z.literal("FULL_DAY"),
  userId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

const createSchema = z.discriminatedUnion("type", [partialSchema, fullDaySchema]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    let userId = searchParams.get("userId") || session.userId;

    // Employees can only see their own
    if (session.role === "EMPLOYEE" && userId !== session.userId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Managers can see their employees
    if (session.role === "MANAGER" && userId !== session.userId) {
      const employee = await prisma.user.findUnique({ where: { id: userId } });
      if (!employee || employee.managerId !== session.userId) {
        return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
      }
    }

    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let dateFilter: any = undefined;
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const start = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00-03:00`);
      const endDay = new Date(y, m, 0).getDate();
      const end = new Date(`${y}-${String(m).padStart(2, "0")}-${endDay}T23:59:59-03:00`);
      dateFilter = { start, end };
    }

    const certificates = await prisma.medicalCertificate.findMany({
      where: {
        userId,
        ...(dateFilter ? {
          OR: [
            { type: "PARTIAL", date: { gte: dateFilter.start, lte: dateFilter.end } },
            { type: "FULL_DAY", startDate: { lte: dateFilter.end }, endDate: { gte: dateFilter.start } },
          ],
        } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const serialized = certificates.map((c) => ({
      id: c.id,
      userId: c.userId,
      createdById: c.createdById,
      createdByName: c.createdBy.name,
      type: c.type,
      date: c.date?.toISOString() || null,
      startDate: c.startDate?.toISOString() || null,
      endDate: c.endDate?.toISOString() || null,
      startTime: c.startTime,
      endTime: c.endTime,
      reason: c.reason,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const data = createSchema.parse(body);

    // Permission check
    if (session.role === "EMPLOYEE" && data.userId !== session.userId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (session.role === "MANAGER") {
      const employee = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!employee || (employee.id !== session.userId && employee.managerId !== session.userId)) {
        return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
      }
    }

    // Validations
    const today = new Date().toISOString().split("T")[0];

    if (data.type === "PARTIAL") {
      if (data.date > today) {
        return NextResponse.json({ error: "Data não pode ser futura" }, { status: 400 });
      }
      if (data.startTime >= data.endTime) {
        return NextResponse.json({ error: "Horário de fim deve ser após o início" }, { status: 400 });
      }
      const hasOverlap = await checkOverlap(data.userId, "PARTIAL", {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      });
      if (hasOverlap) {
        return NextResponse.json({ error: "Já existe atestado nesse período" }, { status: 400 });
      }

      const cert = await prisma.medicalCertificate.create({
        data: {
          userId: data.userId,
          createdById: session.userId,
          type: "PARTIAL",
          date: new Date(`${data.date}T00:00:00-03:00`),
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason || null,
        },
      });

      await createAuditLog({
        actorId: session.userId,
        action: "MEDICAL_CERTIFICATE_CREATED",
        targetUserId: data.userId,
        details: { certificateId: cert.id, type: "PARTIAL", date: data.date, startTime: data.startTime, endTime: data.endTime },
      });

      return NextResponse.json({ certificate: cert }, { status: 201 });
    } else {
      // FULL_DAY
      if (data.startDate > today) {
        return NextResponse.json({ error: "Data não pode ser futura" }, { status: 400 });
      }
      if (data.endDate > today) {
        return NextResponse.json({ error: "Data não pode ser futura" }, { status: 400 });
      }
      if (data.endDate < data.startDate) {
        return NextResponse.json({ error: "Data fim deve ser igual ou após data início" }, { status: 400 });
      }

      const hasOverlap = await checkOverlap(data.userId, "FULL_DAY", {
        startDate: data.startDate,
        endDate: data.endDate,
      });
      if (hasOverlap) {
        return NextResponse.json({ error: "Já existe atestado nesse período" }, { status: 400 });
      }

      const cert = await prisma.medicalCertificate.create({
        data: {
          userId: data.userId,
          createdById: session.userId,
          type: "FULL_DAY",
          startDate: new Date(`${data.startDate}T00:00:00-03:00`),
          endDate: new Date(`${data.endDate}T00:00:00-03:00`),
          date: new Date(`${data.startDate}T00:00:00-03:00`),
          reason: data.reason || null,
        },
      });

      await createAuditLog({
        actorId: session.userId,
        action: "MEDICAL_CERTIFICATE_CREATED",
        targetUserId: data.userId,
        details: { certificateId: cert.id, type: "FULL_DAY", startDate: data.startDate, endDate: data.endDate },
      });

      return NextResponse.json({ certificate: cert }, { status: 201 });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
