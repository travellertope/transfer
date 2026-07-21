"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Zap, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PAYSTACK_PLAN_DETAILS } from "@/lib/paystack-products";

export default function BillingPage() {
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);

  useEffect(() => {
    fetch("/api/geo")
      .then((res) => res.json())
      .then((data) => setShowPaystack(data.country === "NG"))
      .catch(() => {});
  }, []);

  const isPaystackPro = user?.isPro && user.billingProvider === "paystack";
  const ngnPrice = PAYSTACK_PLAN_DETAILS.pro.monthlyNgn;

  const openPortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setPortalLoading(false);
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    const endpoint = showPaystack ? "/api/billing/paystack/checkout" : "/api/billing/checkout";
    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setCheckoutLoading(false);
  };

  const cancelPaystack = async () => {
    if (!window.confirm("Cancel your Paystack subscription? You'll move to the Free plan.")) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/paystack/cancel", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't cancel subscription");
      alert("Subscription cancelled. This can take a minute to reflect here.");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCancelLoading(false);
    }
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
            {user?.isPro
              ? `${isPaystackPro ? `₦${ngnPrice.toLocaleString()}` : "$19"} / month · Renews automatically`
              : "Free forever · Upgrade anytime"}
          </p>
        </div>
        {user?.isPro ? (
          isPaystackPro ? (
            <button
              onClick={cancelPaystack}
              disabled={cancelLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary/40 transition-colors shrink-0"
            >
              {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Cancel
            </button>
          ) : (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary/40 transition-colors shrink-0"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Manage
            </button>
          )
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
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {user?.isPro
                ? isPaystackPro
                  ? `₦${ngnPrice.toLocaleString()} / mo`
                  : "$19 / mo"
                : showPaystack
                  ? `₦${ngnPrice.toLocaleString()} / mo`
                  : "$19 / mo"}
            </span>
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
              {showPaystack ? `Pay with Paystack — ₦${ngnPrice.toLocaleString()}/mo` : "Upgrade to Pro"}
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
          {isPaystackPro ? (
            <>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Subscription</h3>
              <p className="text-sm text-slate-500 mb-4">
                Billed via Paystack. Cancel here to move back to the Free plan.
              </p>
              <button onClick={cancelPaystack} disabled={cancelLoading} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary/40 text-slate-700 dark:text-slate-300 transition-colors">
                {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel subscription
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Billing Portal</h3>
              <p className="text-sm text-slate-500 mb-4">
                Update your payment method, download invoices, or cancel your subscription from the Stripe billing portal.
              </p>
              <button onClick={openPortal} disabled={portalLoading} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary/40 text-slate-700 dark:text-slate-300 transition-colors">
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Open Billing Portal
              </button>
            </>
          )}
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
