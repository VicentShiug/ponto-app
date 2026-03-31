"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Check, X, AlertCircle, Loader2, Calendar, Clock, Eye } from "lucide-react";
import { toast } from "./Toaster";
import { clsx } from "clsx";

interface PreviewData {
  totalLinhas: number;
  diasTrabalhados: number;
  diasSemTrabalho: number;
  diasComAviso: { linha: number; data: string; aviso: string }[];
  ignoradas: number;
  erros: { linha: number; motivo: string }[];
  preview: {
    data: string;
    horaInicio: string;
    intervaloSaida: string;
    intervaloEntrada: string;
    horaFim: string;
    horasTrabalhadas: number;
    semTrabalho: boolean;
    hasWarning: boolean;
    warning?: string;
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

interface ImportResult {
  importados: number;
  ignorados: number;
  erros: string[];
  employeeName?: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Props {
  userRole: "MANAGER" | "EMPLOYEE";
  userId: string;
  employees: Employee[];
}

export default function ImportarCSV({ userRole, userId, employees }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(userRole === "EMPLOYEE" ? userId : "");

  const isManager = userRole === "MANAGER";

  async function analyzeFile(fileToAnalyze: File) {
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", fileToAnalyze);

      const res = await fetch("/api/ponto/importar-csv/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Erro ao analisar arquivo", "error");
        return;
      }

      setPreview(data);
    } catch {
      toast("Erro de conexão", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] || null;
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setPreview(null);
    setResult(null);
    analyzeFile(selectedFile);
  }

  async function handleImport() {
    if (!preview) return;

    setImporting(true);

    try {
      const res = await fetch("/api/ponto/importar-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          employeeId: selectedEmployeeId,
          rows: preview.rows 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Erro ao importar", "error");
        return;
      }

      setResult(data);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      toast("Erro de conexão", "error");
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Employee Selector Card (Only for managers) */}
      {isManager && (
        <div className="card">
          <label className="label">Funcionário</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              handleReset(); // reset file if employee changes
            }}
            disabled={importing || loading}
            className="input"
          >
            <option value="">Selecione o funcionário</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Upload Card */}
      <div className={clsx("card relative transition-opacity", isManager && !selectedEmployeeId && "opacity-60 pointer-events-none")}>
        {isManager && !selectedEmployeeId && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-base/40 backdrop-blur-[2px] rounded-2xl">
            <div className="bg-surface border border-line p-4 rounded-xl shadow-sm text-center">
              <AlertCircle className="mx-auto mb-2 text-ink-3" size={24} />
              <p className="font-medium text-ink">Selecione um funcionário para habilitar o upload</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--accent-subtle)" }}>
            <Upload size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="font-syne font-bold" style={{ color: "var(--text)" }}>Importar Registros de Ponto</h2>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Arquivo CSV com registros de ponto</p>
          </div>
        </div>

        {!preview && !result && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-[var(--accent)]"
              style={{ borderColor: "var(--border-2)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {loading ? (
                <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: "var(--text-3)" }} />
              ) : (
                <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--text-3)" }} />
              )}
              <p className="font-medium" style={{ color: "var(--text)" }}>
                {file ? file.name : "Clique para selecionar um arquivo CSV"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Apenas arquivos .csv"}
              </p>
            </div>
          </div>
        )}

        {preview && !result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
              <div className="flex items-center gap-3">
                <FileText size={20} style={{ color: "var(--accent)" }} />
                <div>
                  <p className="font-medium" style={{ color: "var(--text)" }}>Análise do arquivo</p>
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>{file?.name}</p>
                </div>
              </div>
              <button onClick={handleReset} style={{ color: "var(--text-3)" }}>
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} style={{ color: "var(--accent)" }} />
                  <span className="text-sm" style={{ color: "var(--text-3)" }}>Dias encontrados</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{preview.totalLinhas}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  {preview.diasTrabalhados} trabalhados / {preview.diasSemTrabalho} sem trabalho
                </p>
              </div>

              {preview.diasComAviso.length > 0 && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: "#fef3c7" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={16} style={{ color: "#92400e" }} />
                    <span className="text-sm" style={{ color: "#92400e" }}>Dias com aviso</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: "#92400e" }}>{preview.diasComAviso.length}</p>
                  <p className="text-xs" style={{ color: "#92400e", opacity: 0.8 }}>Dados incompletos</p>
                </div>
              )}
            </div>

            {preview.diasComAviso.length > 0 && (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                <p className="font-medium mb-2">Avisos:</p>
                <ul className="list-disc list-inside space-y-1">
                  {preview.diasComAviso.map((aviso, i) => (
                    <li key={i}>Linha {aviso.linha}: {aviso.data} - {aviso.aviso}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.erros.length > 0 && (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                <p className="font-medium mb-1">Erros que impedem importação:</p>
                <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                  {preview.erros.map((err, i) => (
                    <li key={i}>Linha {err.linha}: {err.motivo}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.preview.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} style={{ color: "var(--text-3)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Preview</span>
                </div>
                <div className="rounded-lg overflow-hidden border max-h-[300px] overflow-y-auto" style={{ borderColor: "var(--border-2)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: "var(--surface-2)", position: "sticky", top: 0 }}>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Data</th>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Início</th>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Int. Saída</th>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Int. Entrada</th>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Fim</th>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Horas</th>
                        <th className="px-2 py-2 text-left font-medium" style={{ color: "var(--text-2)" }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, i) => (
                        <tr 
                          key={i} 
                          className="border-t group"
                          style={{ 
                            borderColor: "var(--border)",
                            backgroundColor: row.hasWarning ? "#fffbeb" : "transparent",
                          }}
                          title={row.hasWarning ? row.warning : undefined}
                        >
                          <td className="px-2 py-2 flex items-center gap-1" style={{ color: "var(--text)" }}>
                            {row.hasWarning && <AlertCircle size={14} style={{ color: "#92400e", flexShrink: 0 }} />}
                            {row.data}
                          </td>
                          <td className="px-2 py-2" style={{ color: "var(--text)" }}>{row.horaInicio}</td>
                          <td className="px-2 py-2" style={{ color: "var(--text)" }}>{row.intervaloSaida}</td>
                          <td className="px-2 py-2" style={{ color: "var(--text)" }}>{row.intervaloEntrada}</td>
                          <td className="px-2 py-2" style={{ color: "var(--text)" }}>{row.horaFim}</td>
                          <td className="px-2 py-2" style={{ color: "var(--text)" }}>{row.horasTrabalhadas > 0 ? row.horasTrabalhadas.toFixed(2).replace(".", ",") : "0,00"}</td>
                          <td className="px-2 py-2">
                            {row.semTrabalho ? (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--surface-3)", color: "var(--text-3)" }}>Folga</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent)" }}>Trabalhado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-lg font-medium transition-all"
                style={{ border: "1px solid var(--border-2)", color: "var(--text-2)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || preview.totalLinhas === 0}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{ backgroundColor: "var(--accent)", color: "white" }}
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Confirmar Importação
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--accent-subtle)" }}>
                <Check size={32} style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Importação Concluída</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
                <Check size={18} className="text-green-500" />
                <span style={{ color: "var(--text)" }}>
                  {result.importados} registros importados
                  {result.employeeName ? ` para ${result.employeeName}` : ""}
                </span>
              </div>
              {result.ignorados > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
                  <AlertCircle size={18} style={{ color: "var(--text-3)" }} />
                  <span style={{ color: "var(--text)" }}>{result.ignorados} registros ignorados</span>
                </div>
              )}
              {result.erros.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                  <X size={18} className="text-red-500 mt-0.5" />
                  <div>
                    <span style={{ color: "#ef4444" }}>Erros:</span>
                    <ul className="list-disc list-inside mt-1 text-sm" style={{ color: "#ef4444" }}>
                      {result.erros.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-lg font-medium transition-all"
              style={{ backgroundColor: "var(--accent)", color: "white" }}
            >
              Importar outro arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
