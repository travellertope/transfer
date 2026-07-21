"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Zap, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function BillingPage() {
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setPortalLoading(false);
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setCheckoutLoading(false);
  };

  const freePros = ["3 transfers per month", "Up to 800MB per file", "Standard FTP", "Basic transfer logs"];
  const proPros = ["Unlimited transfers", "Up to 10GB per file", "FTP + SFTP support", "Priority queue", "Transfer history", "Webhook notifications"];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Plan</h1>
        <p className="text-slate-500 text-sm mt-1">
          You are on the <span className="font-medium text-slate-900 dark:text-white">{user?.isPro ? "Pro" : "Free"}</span> plan.
        </p>
      </div>

      {/* Current plan banner */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${user?.isPro ? "bg-primary/10 border border-primary/20" : "glass-card"}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${user?.isPro ? "bg-primary/20" : "bg-slate-100 dark:bg-slate-800"}`}>
          {user?.isPro ? <Sparkles className="w-6 h-6 text-primary-light" /> : <Zap className="w-6 h-6 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">
            {user?.isPro ? "BluuSync Pro" : "BluuSync Free"}
          </p>
          <p className="text-sm text-slate-500">
            {user?.isPro ? "$19 / month · Renews automatically" : "Free forever · Upgrade anytime"}
          </p>
        </div>
        {user?.isPro ? (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary/40 transition-colors shrink-0"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manage
          </button>
        ) : (
          <button
            onClick={startCheckout}
            disabled={checkoutLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors shrink-0"
          >
            {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Upgrade
          </button>
        )}
      </div>

      {/* Plan comparison */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Free */}
        <div className={`glass-card rounded-2xl p-5 ${!user?.isPro ? "ring-1 ring-primary/20" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Free</h3>
            <span className="text-sm font-bold text-slate-900 dark:text-white">$0</span>
          </div>
          <ul className="space-y-2">
            {freePros.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          {!user?.isPro && (
            <p className="mt-4 text-xs text-center text-primary-light font-medium">Current plan</p>
          )}
        </div>

        {/* Pro */}
        <div className={`glass-card rounded-2xl p-5 border-primary/30 ${user?.isPro ? "ring-1 ring-primary/20" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Pro</h3>
            <span className="text-sm font-bold text-slate-900 dark:text-white">$19 / mo</span>
          </div>
          <ul className="space-y-2">
            {proPros.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-primary-light shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          {user?.isPro ? (
            <p className="mt-4 text-xs text-center text-primary-light font-medium">Current plan</p>
          ) : (
            <button onClick={startCheckout} disabled={checkoutLoading} className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl transition-colors">
              {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mt-6">
        Need unlimited file size and team accounts?{" "}
        <a href="mailto:sales@bluuhq.com?subject=BluuSync%20Enterprise" className="text-primary-light hover:underline">
          Contact us about Enterprise
        </a>
      </p>

      {user?.isPro && (
        <div className="mt-6 glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Billing Portal</h3>
          <p className="text-sm text-slate-500 mb-4">
            Update your payment method, download invoices, or cancel your subscription from the Stripe billing portal.
          </p>
          <button onClick={openPortal} disabled={portalLoading} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary/40 text-slate-700 dark:text-slate-300 transition-colors">
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Open Billing Portal
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-4">
        Questions about billing?{" "}
        <Link href="mailto:support@bluuhq.com" className="text-primary-light hover:underline">
          Contact support
        </Link>
      </p>
    </div>
  );
}
