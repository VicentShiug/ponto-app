"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme  = "dark" | "light";
type Accent = "default" | "blue" | "violet" | "rose" | "amber" | "emerald" | "cyan" | "orange";

interface ThemeCtx {
  theme:  Theme;
  accent: Accent;
  setTheme:  (t: Theme)  => void;
  setAccent: (a: Accent) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "dark", accent: "default",
  setTheme: () => {}, setAccent: () => {},
});

export function useTheme() { return useContext(Ctx); }

export function ThemeProvider({
  children,
  initialAccent,
}: {
  children: ReactNode;
  initialAccent?: string;
}) {
  const [theme,  setThemeState]  = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>((initialAccent as Accent) ?? "default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ponto_theme") as Theme | null;
    if (saved) setThemeState(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    if (theme === "light") {
      html.setAttribute("data-theme", "light");
    } else {
      html.removeAttribute("data-theme");
    }
    localStorage.setItem("ponto_theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    const html = document.documentElement;
    if (accent === "default") {
      html.removeAttribute("data-accent");
    } else {
      html.setAttribute("data-accent", accent);
    }
  }, [accent]);

  function setTheme(t: Theme) { setThemeState(t); }

  function setAccent(a: Accent) {
    setAccentState(a);
    // Persist accent to DB
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: a }),
    }).catch(() => {});
  }

  return (
    <Ctx.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </Ctx.Provider>
  );
}
