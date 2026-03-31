import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calculateHourBankBalance } from "@/lib/hours";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || session.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
    }

    const balanceMinutes = await calculateHourBankBalance(session.userId);

    return NextResponse.json({ balanceMinutes });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === "Usuário não encontrado") {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
