"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Menu, X, Sparkles, LayoutDashboard, CreditCard, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { useAuth } from "./AuthProvider";

const links = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const navLinkClass =
  "px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const openBillingPortal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-primary-light" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">AirFTP</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <a key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {!isLoading && (
            <>
              {user ? (
                <ProfileMenu
                  name={user.name}
                  email={user.email}
                  isPro={user.isPro}
                  onLogout={logout}
                  onManageSubscription={openBillingPortal}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className={navLinkClass}>
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-full transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-surface border-t border-slate-200 dark:border-slate-800 px-4 py-4">
          <div className="space-y-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {!isLoading && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              {user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="w-9 h-9 rounded-full bg-primary/20 text-primary-light text-xs font-semibold flex items-center justify-center shrink-0">
                      {(user.name.trim() || user.email).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {user.name || user.email}
                      </p>
                      {user.isPro && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-primary/15 text-primary-light text-[11px] font-semibold rounded-full">
                          <Sparkles className="w-3 h-3" /> Pro
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  {user.isPro && (
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        openBillingPortal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors text-left"
                    >
                      <CreditCard className="w-4 h-4" /> Manage Subscription
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-full transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
