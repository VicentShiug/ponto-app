import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await requireManager();
    const { id: employeeId } = params;

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, role: true },
    });

    if (!employee || employee.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { userId: employeeId },
      select: { id: true },
    });

    if (entries.length === 0) {
      return NextResponse.json({ error: "Nenhum registro para excluir" }, { status: 400 });
    }

    await prisma.timeEntry.deleteMany({
      where: { userId: employeeId },
    });

    await createAuditLog({
      actorId: session.userId,
      action: "DELETE_ALL_EMPLOYEE_ENTRIES",
      targetUserId: employeeId,
      details: {
        employeeName: employee.name,
        entriesCount: entries.length,
      },
    });

    return NextResponse.json({ success: true, deletedCount: entries.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
