"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, CreditCard, LogOut, Sparkles } from "lucide-react";

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ProfileMenu({
  name,
  email,
  isPro,
  onLogout,
  onManageSubscription,
}: {
  name: string;
  email: string;
  isPro: boolean;
  onLogout: () => void;
  onManageSubscription: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
      >
        <span className="relative w-8 h-8 rounded-full bg-primary/20 text-primary-light text-xs font-semibold flex items-center justify-center shrink-0">
          {initials(name, email)}
          {isPro && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center ring-2 ring-white dark:ring-[#020617]">
              <Sparkles className="w-2 h-2 text-white" />
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface shadow-lg shadow-slate-900/10 dark:shadow-black/40 overflow-hidden z-50 animate-dropdown-in">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{name || email}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
            {isPro && (
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-primary/15 text-primary-light text-[11px] font-semibold rounded-full">
                <Sparkles className="w-3 h-3" /> Pro
              </span>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            {isPro && (
              <button
                onClick={() => {
                  setOpen(false);
                  onManageSubscription();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <CreditCard className="w-4 h-4" /> Manage Subscription
              </button>
            )}
          </div>
          <div className="py-1 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
