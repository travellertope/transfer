"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Menu, X, Sparkles } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";

const links = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

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
        <a href="#" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-primary-light" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">AirFTP</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          {!isLoading && (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    {user.name}
                    {user.isPro && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary-light text-xs font-semibold rounded-full">
                        <Sparkles className="w-3 h-3" /> Pro
                      </span>
                    )}
                  </span>
                  {user.isPro && (
                    <button
                      onClick={openBillingPortal}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Manage Subscription
                    </button>
                  )}
                  <button
                    onClick={() => logout()}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/login"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="text-slate-600 dark:text-slate-400"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-surface border-t border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          {!isLoading && (
            <>
              {user ? (
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    {user.name}
                    {user.isPro && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary-light text-xs font-semibold rounded-full">
                        <Sparkles className="w-3 h-3" /> Pro
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-4">
                    {user.isPro && (
                      <button
                        onClick={() => {
                          setMobileOpen(false);
                          openBillingPortal();
                        }}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Manage Plan
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-5 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
