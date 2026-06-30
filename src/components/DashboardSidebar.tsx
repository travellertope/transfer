"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  LayoutDashboard,
  ArrowUpDown,
  Server,
  History,
  LogOut,
  Menu,
  X,
  Sparkles,
  CreditCard,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "New Transfer", href: "/dashboard/transfer", icon: ArrowUpDown, exact: false },
  { label: "Saved Servers", href: "/dashboard/servers", icon: Server, exact: false },
  { label: "History", href: "/dashboard/history", icon: History, exact: false },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const openBillingPortal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 h-16 flex items-center border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-4 h-4 text-primary-light" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">AirFTP</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary-light"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user info + actions */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          {user?.isPro && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary-light text-xs font-semibold rounded-full shrink-0 ml-2">
              <Sparkles className="w-3 h-3" /> Pro
            </span>
          )}
        </div>

        {user?.isPro && (
          <button
            onClick={openBillingPortal}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            Manage Subscription
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Log Out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/90 dark:bg-[#020617]/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <ArrowRightLeft className="w-3.5 h-3.5 text-primary-light" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">AirFTP</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-slate-600 dark:text-slate-400"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-full bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-slate-800 h-full pt-14">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
