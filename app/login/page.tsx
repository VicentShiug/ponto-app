"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao fazer login"); return; }
      router.push(data.redirect);
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--bg)" }}>
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5" style={{ border: "1px solid var(--border-2)" }}>
            <Clock size={18} style={{ color: "var(--text)" }} />
          </div>
          <h1 className="font-syne text-xl font-bold" style={{ color: "var(--text)" }}>PontoApp</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Controle de ponto</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>

            {error && (
              <p className="text-xs px-4 py-3 rounded-xl" style={{ color: "var(--text-3)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-fg)", borderTopColor: "transparent" }} />
                  Entrando...
                </span>
              ) : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-4)" }}>
          © {new Date().getFullYear()} PontoApp
        </p>
      </div>
    </div>
  );
}
