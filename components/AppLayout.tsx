"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock, LayoutDashboard, Users, FileText, ClipboardList, LogOut, Menu, X, Sun, Moon, User } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "./ThemeProvider";

interface NavItem { href: string; label: string; icon: React.ReactNode; }

const managerNav: NavItem[] = [
  { href: "/manager/dashboard", label: "Dashboard",    icon: <LayoutDashboard size={15} /> },
  { href: "/manager/employees", label: "Funcionários", icon: <Users size={15} /> },
  { href: "/manager/reports",   label: "Relatórios",   icon: <FileText size={15} /> },
  { href: "/manager/audit",     label: "Auditoria",    icon: <ClipboardList size={15} /> },
];

const employeeNav: NavItem[] = [
  { href: "/employee/dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  { href: "/employee/history",   label: "Histórico",  icon: <ClipboardList size={15} /> },
];

export default function AppLayout({
  children, userName, userRole, avatarUrl,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: "MANAGER" | "EMPLOYEE";
  avatarUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme } = useTheme();
  const nav = userRole === "MANAGER" ? managerNav : employeeNav;
  const initials = userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: "1px solid var(--border-2)" }}>
          <Clock size={14} style={{ color: "var(--text)" }} />
        </div>
        <span className="font-syne font-bold text-sm" style={{ color: "var(--text)" }}>PontoApp</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={active ? {
                backgroundColor: "var(--accent-subtle)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              } : {
                color: "var(--text-3)",
                border: "1px solid transparent",
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2.5 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "var(--text-3)" }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>

        {/* Profile */}
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "var(--text-3)", border: pathname === "/profile" ? "1px solid var(--accent-border)" : "1px solid transparent", backgroundColor: pathname === "/profile" ? "var(--accent-subtle)" : "transparent" }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: "var(--surface-3)", color: "var(--text-2)" }}>
              {initials}
            </div>
          )}
          <span>Perfil</span>
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "var(--text-3)" }}
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col fixed h-full" style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setOpen(false)} />
      )}
      <aside
        className={clsx("fixed inset-y-0 left-0 z-50 w-52 flex flex-col transition-transform duration-300 lg:hidden", open ? "translate-x-0" : "-translate-x-full")}
        style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <button onClick={() => setOpen(false)} className="absolute top-4 right-3" style={{ color: "var(--text-3)" }}>
          <X size={17} />
        </button>
        <Sidebar />
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-52 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3.5" style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setOpen(true)} style={{ color: "var(--text-3)" }}><Menu size={19} /></button>
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: "var(--text)" }} />
            <span className="font-syne font-bold text-sm" style={{ color: "var(--text)" }}>PontoApp</span>
          </div>
          <Link href="/profile">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "var(--surface-3)", color: "var(--text-2)" }}>
                {initials}
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1 p-4 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
