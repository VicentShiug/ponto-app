"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme  = "dark" | "light";
type Accent = "default" | "blue" | "violet" | "rose" | "amber" | "emerald" | "cyan" | "orange";
type Intensity = "soft" | "medium" | "high";

interface ThemeCtx {
  theme:  Theme;
  accent: Accent;
  lightIntensity: Intensity;
  darkIntensity: Intensity;
  setTheme:  (t: Theme)  => void;
  setAccent: (a: Accent) => void;
  setLightIntensity: (i: Intensity) => void;
  setDarkIntensity: (i: Intensity) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: "dark", accent: "default", lightIntensity: "medium", darkIntensity: "medium",
  setTheme: () => {}, setAccent: () => {}, setLightIntensity: () => {}, setDarkIntensity: () => {},
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
  const [lightIntensity, setLightIntensityState] = useState<Intensity>("medium");
  const [darkIntensity, setDarkIntensityState] = useState<Intensity>("medium");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("ponto_theme") as Theme | null;
    if (savedTheme) setThemeState(savedTheme);
    
    const savedLight = localStorage.getItem("ponto_light_intensity") as Intensity | null;
    if (savedLight) setLightIntensityState(savedLight);
    
    const savedDark = localStorage.getItem("ponto_dark_intensity") as Intensity | null;
    if (savedDark) setDarkIntensityState(savedDark);
    
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
    if (!mounted) return;
    const html = document.documentElement;
    const intensity = theme === "light" ? lightIntensity : darkIntensity;
    html.setAttribute("data-intensity", intensity);
    localStorage.setItem(`ponto_${theme}_intensity`, intensity);
  }, [theme, lightIntensity, darkIntensity, mounted]);

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
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: a }),
    }).catch(() => {});
  }

  function setLightIntensity(i: Intensity) { setLightIntensityState(i); }
  function setDarkIntensity(i: Intensity) { setDarkIntensityState(i); }

  return (
    <Ctx.Provider value={{ theme, accent, lightIntensity, darkIntensity, setTheme, setAccent, setLightIntensity, setDarkIntensity }}>
      {children}
    </Ctx.Provider>
  );
}
