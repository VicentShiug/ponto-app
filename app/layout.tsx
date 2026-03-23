import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  let initialAccent = "default";
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { accentColor: true },
    });
    initialAccent = user?.accentColor ?? "default";
  }

  return (
    <html lang="pt-BR" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="font-dm bg-base text-base antialiased">
        <ThemeProvider initialAccent={initialAccent}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
