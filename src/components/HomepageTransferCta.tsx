"use client";

import Link from "next/link";
import { ArrowUpDown, LayoutDashboard } from "lucide-react";
import { useAuth } from "./AuthProvider";
import TransferForm from "./TransferForm";

export default function HomepageTransferCta() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return (
      <section id="transfer" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-7 h-7 text-primary-light" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Ready to <span className="gradient-text">Transfer?</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
            Head to your dashboard to start a transfer, manage saved servers, and view your history.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/dashboard/transfer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
            >
              <ArrowUpDown className="w-5 h-5" /> New Transfer
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-slate-300 dark:border-slate-600 hover:border-primary/50 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" /> Go to Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <TransferForm />;
}
