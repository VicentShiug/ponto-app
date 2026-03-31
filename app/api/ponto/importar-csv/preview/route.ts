import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { parseDate } from "@/lib/dates";

interface ParsedRow {
  rowIndex: number;
  date: string;
  clockIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  clockOut: string | null;
  workedHours: number;
  description: string;
  isValid: boolean;
  isEmptyDay: boolean;
  hasWarning: boolean;
  warning?: string;
}

interface AnalysisResult {
  totalLinhas: number;
  diasTrabalhados: number;
  diasSemTrabalho: number;
  diasComAviso: { linha: number; data: string; aviso: string }[];
  ignoradas: number;
  erros: { linha: number; motivo: string }[];
  preview: {
    data: string;
    horaInicio: string;
    horaFim: string;
    horasTrabalhadas: number;
    semTrabalho: boolean;
  }[];
  rows: {
    date: string;
    clockIn: string | null;
    lunchOut: string | null;
    lunchIn: string | null;
    clockOut: string | null;
    workedHours: number;
    description: string;
    isEmptyDay: boolean;
  }[];
}

function parseTime(timeStr: string | null): string | null {
  if (!timeStr || timeStr.trim() === "") return null;
  const regex = /^\d{2}:\d{2}$/;
  if (!regex.test(timeStr)) return null;
  return timeStr;
}

function parseDecimal(value: string): number {
  if (!value || value.trim() === "") return 0;
  return parseFloat(value.replace(",", "."));
}

function calculateWorkedHours(
  clockIn: string | null,
  clockOut: string | null,
  lunchOut: string | null,
  lunchIn: string | null
): number {
  if (!clockIn || !clockOut) return 0;
  
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  
  const workMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  
  let lunchMinutes = 0;
  if (lunchOut && lunchIn) {
    const [loutH, loutM] = lunchOut.split(":").map(Number);
    const [linH, linM] = lunchIn.split(":").map(Number);
    lunchMinutes = (linH * 60 + linM) - (loutH * 60 + loutM);
  }
  
  const totalMinutes = workMinutes - lunchMinutes;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function parseCSV(content: string): ParsedRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== "");
  const results: ParsedRow[] = [];
  let ignoredCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(",").map(col => col.trim());
    
    const dateStr = columns[0];

    if (!dateStr || dateStr.trim() === "") {
      ignoredCount++;
      continue;
    }

    if (dateStr.toLowerCase() === "data") {
      ignoredCount++;
      continue;
    }

    let date: Date;
    try {
      date = parseDate(dateStr);
    } catch {
      ignoredCount++;
      continue;
    }

    const clockIn = parseTime(columns[1]);
    const lunchOut = parseTime(columns[2]);
    const lunchIn = parseTime(columns[3]);
    const clockOut = parseTime(columns[4]);
    const workedHours = parseDecimal(columns[5]);
    const description = columns[8] || "";

    const hasAnyTime = clockIn || lunchOut || lunchIn || clockOut;
    const hasClockInAndOut = clockIn && clockOut;
    const isEmptyDay = !clockIn && !lunchOut && !lunchIn && !clockOut;
    const hasFullInterval = (lunchOut && lunchIn) || (!lunchOut && !lunchIn);
    const hasPartialInterval = (lunchOut && !lunchIn) || (!lunchOut && lunchIn);

    if (isEmptyDay) {
      results.push({
        rowIndex: i + 1,
        date: dateStr,
        clockIn: null,
        lunchOut: null,
        lunchIn: null,
        clockOut: null,
        workedHours: 0,
        description,
        isValid: true,
        isEmptyDay: true,
        hasWarning: false,
      });
      continue;
    }

    if (hasClockInAndOut) {
      let hasWarning = false;
      let warning = "";

      if (hasPartialInterval) {
        hasWarning = true;
        warning = "Intervalo incompleto - importando com informações disponíveis";
      }

      results.push({
        rowIndex: i + 1,
        date: dateStr,
        clockIn,
        lunchOut,
        lunchIn,
        clockOut,
        workedHours,
        description,
        isValid: true,
        isEmptyDay: false,
        hasWarning,
        warning,
      });
      continue;
    }

    results.push({
      rowIndex: i + 1,
      date: dateStr,
      clockIn,
      lunchOut,
      lunchIn,
      clockOut,
      workedHours,
      description,
      isValid: true,
      isEmptyDay: false,
      hasWarning: true,
      warning: "Dados incompletos - importando com informações disponíveis",
    });
  }

  return results;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();

    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;

    if (!arquivo) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!arquivo.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Arquivo deve ser .csv" }, { status: 400 });
    }

    const content = await arquivo.text();
    const parsed = parseCSV(content);

    const validRows = parsed.filter(r => r.isValid);
    const rowsWithWarnings = parsed.filter(r => r.hasWarning);
    const emptyDays = validRows.filter(r => r.isEmptyDay);
    const daysWithWork = validRows.filter(r => !r.isEmptyDay);

    const preview = validRows.map(r => ({
      data: r.date,
      horaInicio: r.clockIn || "-",
      intervaloSaida: r.lunchOut || "-",
      intervaloEntrada: r.lunchIn || "-",
      horaFim: r.clockOut || "-",
      horasTrabalhadas: calculateWorkedHours(r.clockIn, r.clockOut, r.lunchOut, r.lunchIn),
      semTrabalho: r.isEmptyDay,
      hasWarning: r.hasWarning,
      warning: r.warning || "",
    }));

    const rows = validRows.map(r => ({
      date: r.date,
      clockIn: r.clockIn,
      lunchOut: r.lunchOut,
      lunchIn: r.lunchIn,
      clockOut: r.clockOut,
      workedHours: calculateWorkedHours(r.clockIn, r.clockOut, r.lunchOut, r.lunchIn),
      description: r.description,
      isEmptyDay: r.isEmptyDay,
    }));

    const result: AnalysisResult = {
      totalLinhas: validRows.length,
      diasTrabalhados: daysWithWork.length,
      diasSemTrabalho: emptyDays.length,
      diasComAviso: rowsWithWarnings.map(r => ({
        linha: r.rowIndex,
        data: r.date,
        aviso: r.warning || "",
      })),
      ignoradas: 0,
      erros: [],
      preview,
      rows,
    };

    return NextResponse.json(result);
  } catch (err) {
    if ((err as Error).message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
