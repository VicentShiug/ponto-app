"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { formatMinutes } from "@/lib/hours";

interface Employee { id: string; name: string; weeklyHours: number; overtimeMode: string }

interface Props { employees: Employee[] }

export default function ReportsClient({ employees }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState<"pdf" | "xlsx" | null>(null);

  function toggleEmployee(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelectedIds(selectedIds.length === employees.length ? [] : employees.map((e) => e.id));
  }

  async function fetchData() {
    if (!selectedIds.length || !startDate || !endDate) {
      toast("Selecione funcionários e período", "error");
      return null;
    }
    const res = await fetch(`/api/manager/reports?ids=${selectedIds.join(",")}&start=${startDate}&end=${endDate}`);
    if (!res.ok) { toast("Erro ao buscar dados", "error"); return null; }
    return res.json();
  }

  async function exportPDF() {
    setLoading("pdf");
    try {
      const data = await fetchData();
      if (!data) return;

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      for (let i = 0; i < data.length; i++) {
        const report = data[i];
        if (i > 0) doc.addPage();

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(report.employeeName, 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Período: ${startDate} a ${endDate}`, 14, 28);
        doc.text(`Carga: ${report.weeklyHours}h/sem  |  Saldo: ${formatMinutes(report.balanceMinutes)}`, 14, 34);

        autoTable(doc, {
          startY: 42,
          head: [["Data", "Dia", "Entrada", "Almoço", "Volta", "Saída", "Total", "Diferença"]],
          body: report.entries.map((e: any) => [
            e.date, e.weekday, e.clockIn, e.lunchOut, e.lunchIn, e.clockOut,
            formatMinutes(e.workedMinutes), (e.diff >= 0 ? "+" : "") + formatMinutes(e.diff),
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
      }

      doc.save(`relatorio_${startDate}_${endDate}.pdf`);
      toast("PDF exportado!", "success");
    } catch (e) {
      console.error(e);
      toast("Erro ao gerar PDF", "error");
    } finally {
      setLoading(null);
    }
  }

  async function exportXLSX() {
    setLoading("xlsx");
    try {
      const data = await fetchData();
      if (!data) return;

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      for (const report of data) {
        const rows = [
          [report.employeeName],
          [`Período: ${startDate} a ${endDate}`],
          [`Carga: ${report.weeklyHours}h/sem`, "", "", "", "", "", "", `Saldo: ${formatMinutes(report.balanceMinutes)}`],
          [],
          ["Data", "Dia", "Entrada", "Saída Almoço", "Volta Almoço", "Saída", "Total (min)", "Diferença (min)"],
          ...report.entries.map((e: any) => [
            e.date, e.weekday, e.clockIn, e.lunchOut, e.lunchIn, e.clockOut,
            e.workedMinutes, e.diff,
          ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [14, 8, 10, 14, 14, 10, 12, 14].map((w) => ({ wch: w }));
        const sheetName = report.employeeName.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      XLSX.writeFile(wb, `relatorio_${startDate}_${endDate}.xlsx`);
      toast("Excel exportado!", "success");
    } catch (e) {
      console.error(e);
      toast("Erro ao gerar Excel", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>Relatórios</h1>
        <p className="text-3 text-sm mt-0.5">Exporte registros de ponto em PDF ou Excel</p>
      </div>

      {/* Period */}
      <div className="card space-y-4">
        <p className="text-sm font-medium text-ink-2">Período</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data inicial</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Data final</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Employees */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink-2">Funcionários</p>
          <button onClick={toggleAll} className="text-xs text-hi hover:text-hi-hover transition-colors">
            {selectedIds.length === employees.length ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        </div>
        <div className="space-y-2">
          {employees.map((emp) => {
            const selected = selectedIds.includes(emp.id);
            return (
              <button
                key={emp.id}
                onClick={() => toggleEmployee(emp.id)}
                className={clsx(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                  selected ? "border-hi-border bg-hi-sub" : "border-line hover:border-line-2"
                )}
              >
                <div className={clsx(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                  selected ? "bg-hi border-hi text-hi-fg" : "border-line-2"
                )}>
                  {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{emp.name}</p>
                  <p className="text-xs text-3">{emp.weeklyHours}h/sem · {emp.overtimeMode === "HOUR_BANK" ? "Banco de Horas" : "Hora Extra"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button
          onClick={exportPDF}
          disabled={!!loading}
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          {loading === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Exportar PDF
        </button>
        <button
          onClick={exportXLSX}
          disabled={!!loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading === "xlsx" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
