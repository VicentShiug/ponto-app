"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sun, Moon, Check, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/components/Toaster";
import { useTheme } from "@/components/ThemeProvider";

interface User {
  id: string;
  name: string;
  email: string;
  weeklyHours: number;
  role: string;
  avatarUrl: string | null;
  accentColor: string;
}

const ACCENTS = [
  { id: "default", label: "Padrão",    hex: "bg-white dark:bg-white border-white/30" },
  { id: "blue",    label: "Azul",       hex: "bg-blue-500 border-blue-400" },
  { id: "violet",  label: "Violeta",    hex: "bg-violet-500 border-violet-400" },
  { id: "rose",    label: "Rosa",       hex: "bg-rose-500 border-rose-400" },
  { id: "amber",   label: "Âmbar",      hex: "bg-amber-500 border-amber-400" },
  { id: "emerald", label: "Esmeralda",  hex: "bg-emerald-500 border-emerald-400" },
  { id: "cyan",    label: "Ciano",      hex: "bg-cyan-500 border-cyan-400" },
  { id: "orange",  label: "Laranja",    hex: "bg-orange-500 border-orange-400" },
];

const INTENSITIES = [
  { id: "soft",   label: "Suave" },
  { id: "medium", label: "Padrão" },
  { id: "high",   label: "Intenso" },
];

export default function ProfileClient({ user: initial }: { user: User }) {
  const router = useRouter();
  const { theme, accent, lightIntensity, darkIntensity, setTheme, setAccent, setLightIntensity, setDarkIntensity } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState(initial.name);
  const [weeklyHours, setWeeklyHours] = useState(String(initial.weeklyHours));
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(initial.avatarUrl);
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [savingPw, setSavingPw]       = useState(false);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          weeklyHours: Number(weeklyHours),
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao salvar", "error"); return; }
      toast("Perfil atualizado!", "success");
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSaving(false); }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw) { toast("Preencha os campos de senha", "error"); return; }
    setSavingPw(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro", "error"); return; }
      toast("Senha alterada!", "success");
      setCurrentPw(""); setNewPw("");
    } catch { toast("Erro de conexão", "error"); }
    finally { setSavingPw(false); }
  }

  function handleAccentChange(id: string) {
    setAccent(id as any);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) { toast("Foto muito grande (máx 300KB)", "error"); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setAvatarUrl(base64);
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: base64 }),
      });
      toast("Foto atualizada!", "success");
    };
    reader.readAsDataURL(file);
  }

  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="font-syne text-2xl font-bold text-ink">Perfil</h1>
        <p className="text-3 text-sm mt-0.5">{initial.email}</p>
      </div>

      {/* Avatar */}
      <div className="card flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-2 border border-base flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-syne font-bold text-xl text-ink">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-accent rounded-full flex items-center justify-center shadow-lg"
          >
            <Camera size={13} style={{ color: "var(--accent-fg)" }} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <p className="font-medium text-ink">{name}</p>
          <p className="text-3 text-xs mt-0.5">{initial.role === "MANAGER" ? "Gestor" : "Funcionário"}</p>
        </div>
      </div>

      {/* Info */}
      <div className="card space-y-4">
        <p className="text-[10px] text-3 uppercase tracking-widest">Informações</p>
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {initial.role === "EMPLOYEE" && (
          <div>
            <label className="label">Carga Horária Semanal (h)</label>
            <input
              className="input"
              type="number" min="1" max="60"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
            />
          </div>
        )}
        <button onClick={handleSaveProfile} disabled={saving} className="btn-primary w-full">
          {saving ? "Salvando..." : "Salvar informações"}
        </button>
      </div>

      {/* Password */}
      <div className="card space-y-4">
        <p className="text-[10px] text-3 uppercase tracking-widest">Alterar senha</p>
        <div>
          <label className="label">Senha atual</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPw ? "text" : "password"}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-3 hover:text-2"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Nova senha</label>
          <input
            className="input"
            type={showPw ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <button onClick={handleChangePassword} disabled={savingPw} className="btn-secondary w-full">
          {savingPw ? "Alterando..." : "Alterar senha"}
        </button>
      </div>

      {/* Theme */}
      <div className="card space-y-4">
        <p className="text-[10px] text-3 uppercase tracking-widest">Aparência</p>

        {/* Dark / Light toggle */}
        <div>
          <label className="label">Tema</label>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all",
                  theme === t
                    ? "bg-accent-subtle border-accent text-accent"
                    : "bg-surface-2 border-base text-3 hover:text-2"
                )}
              >
                {t === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                {t === "dark" ? "Escuro" : "Claro"}
                {theme === t && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity selector */}
        <div>
          <label className="label">Intensidade do tema</label>
          <div className="flex gap-2">
            {INTENSITIES.map((i) => {
              const currentIntensity = theme === "light" ? lightIntensity : darkIntensity;
              const isSelected = currentIntensity === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => theme === "light" ? setLightIntensity(i.id as any) : setDarkIntensity(i.id as any)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all",
                    isSelected
                      ? "bg-accent-subtle border-accent text-accent"
                      : "bg-surface-2 border-base text-3 hover:text-2"
                  )}
                >
                  {i.label}
                  {isSelected && <Check size={13} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <label className="label">Cor de destaque</label>
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAccentChange(a.id)}
                className={clsx(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                  accent === a.id
                    ? "bg-accent-subtle border-accent"
                    : "border-base hover:bg-surface-2"
                )}
              >
                <div className={clsx("w-6 h-6 rounded-full border-2", a.hex)} />
                <span className="text-[9px] text-3 uppercase tracking-wide">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
