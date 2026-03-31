"use client";

import { createContext, useContext, useEffect, useState, useLayoutEffect, ReactNode } from "react";

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
  theme: "light", accent: "default", lightIntensity: "medium", darkIntensity: "medium",
  setTheme: () => {}, setAccent: () => {}, setLightIntensity: () => {}, setDarkIntensity: () => {},
});

export function useTheme() { return useContext(Ctx); }

export function ThemeProvider({
  children,
  initialAccent,
  initialTheme,
  initialLightIntensity,
  initialDarkIntensity,
  isLoggedIn,
}: {
  children: ReactNode;
  initialAccent?: string;
  initialTheme?: string;
  initialLightIntensity?: string;
  initialDarkIntensity?: string;
  isLoggedIn?: boolean;
}) {
  const [theme,  setThemeState]  = useState<Theme>((initialTheme as Theme) ?? "light");
  const [accent, setAccentState] = useState<Accent>((initialAccent as Accent) ?? "default");
  const [lightIntensity, setLightIntensityState] = useState<Intensity>((initialLightIntensity as Intensity) ?? "medium");
  const [darkIntensity, setDarkIntensityState] = useState<Intensity>((initialDarkIntensity as Intensity) ?? "medium");

  // Apply theme immediately on mount (synced with server)
  useLayoutEffect(() => {
    const html = document.documentElement;
    
    // Apply theme
    if (theme === "light") {
      html.setAttribute("data-theme", "light");
    } else {
      html.removeAttribute("data-theme");
    }
    
    // Apply intensity
    const intensity = theme === "light" ? lightIntensity : darkIntensity;
    html.setAttribute("data-intensity", intensity);
    
    // Apply accent
    if (accent === "default") {
      html.removeAttribute("data-accent");
    } else {
      html.setAttribute("data-accent", accent);
    }
  }, [theme, accent, lightIntensity, darkIntensity]);

  // Load saved preferences from localStorage only when NOT logged in
  // When logged in, use server values (initial props)
  useEffect(() => {
    if (isLoggedIn) {
      // When logged in, use theme from server (already set via props)
      return;
    }
    
    // When not logged in (guest), use localStorage
    const savedTheme = localStorage.getItem("ponto_theme") as Theme | null;
    if (savedTheme) setThemeState(savedTheme);
    
    const savedLight = localStorage.getItem("ponto_light_intensity") as Intensity | null;
    if (savedLight) setLightIntensityState(savedLight);
    
    const savedDark = localStorage.getItem("ponto_dark_intensity") as Intensity | null;
    if (savedDark) setDarkIntensityState(savedDark);
    
    const savedAccent = localStorage.getItem("ponto_accent") as Accent | null;
    if (savedAccent) setAccentState(savedAccent);
  }, [isLoggedIn]);

  // Save theme changes to localStorage
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem("ponto_theme", theme);
    }
  }, [theme, isLoggedIn]);

  // Save intensity changes to localStorage
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem(`ponto_${theme}_intensity`, theme === "light" ? lightIntensity : darkIntensity);
    }
  }, [theme, lightIntensity, darkIntensity, isLoggedIn]);

  function setTheme(t: Theme) { 
    setThemeState(t); 
    localStorage.setItem("ponto_theme", t);
    if (isLoggedIn) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: t }),
      }).catch(() => {});
    }
  }

  function setAccent(a: Accent) {
    setAccentState(a);
    localStorage.setItem("ponto_accent", a);
    if (isLoggedIn) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: a }),
      }).catch(() => {});
    }
  }

  function setLightIntensity(i: Intensity) { 
    setLightIntensityState(i); 
    localStorage.setItem("ponto_light_intensity", i);
    if (isLoggedIn) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lightIntensity: i }),
      }).catch(() => {});
    }
  }
  
  function setDarkIntensity(i: Intensity) { 
    setDarkIntensityState(i); 
    localStorage.setItem("ponto_dark_intensity", i);
    if (isLoggedIn) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkIntensity: i }),
      }).catch(() => {});
    }
  }

  return (
    <Ctx.Provider value={{ theme, accent, lightIntensity, darkIntensity, setTheme, setAccent, setLightIntensity, setDarkIntensity }}>
      {children}
    </Ctx.Provider>
  );
}
