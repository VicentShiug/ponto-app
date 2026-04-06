import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/Toaster";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PontoApp – Registro de Horas",
  description: "Sistema de controle de ponto e banco de horas",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isLoggedIn = !!session;
  let initialAccent = "default";
  let initialTheme = "light";
  let initialLightIntensity = "medium";
  let initialDarkIntensity = "medium";
  
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { accentColor: true, theme: true, lightIntensity: true, darkIntensity: true },
    });
    if (user) {
      initialAccent = user.accentColor ?? "default";
      initialTheme = user.theme ?? "light";
      initialLightIntensity = user.lightIntensity ?? "medium";
      initialDarkIntensity = user.darkIntensity ?? "medium";
    }
  }

  return (
    <html 
      lang="pt-BR" 
      className={`${syne.variable} ${dmSans.variable}`}
      data-theme={initialTheme}
      data-intensity={initialTheme === "light" ? initialLightIntensity : initialDarkIntensity}
      data-accent={initialAccent === "default" ? undefined : initialAccent}
    >
      <body className="font-dm bg-base text-base antialiased">
        <ThemeProvider 
          key={session?.userId ?? "guest"}
          isLoggedIn={isLoggedIn}
          initialAccent={initialAccent} 
          initialTheme={initialTheme}
          initialLightIntensity={initialLightIntensity}
          initialDarkIntensity={initialDarkIntensity}
        >
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
