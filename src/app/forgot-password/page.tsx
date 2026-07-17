"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRightLeft, MailCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const inputClass =
  "w-full px-4 py-3 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-primary-light" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">AirFTP</span>
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-6 h-6 text-primary-light" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Check your email
              </h1>
              <p className="text-sm text-slate-500">
                If an account exists for <span className="font-medium">{email}</span>, we&apos;ve
                sent a link to reset your password.
              </p>
              <p className="text-sm text-slate-500 mt-6">
                <Link href="/login" className="text-primary-light hover:underline">
                  Back to log in
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 text-center">
                Reset your password
              </h1>
              <p className="text-sm text-slate-500 text-center mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="text-sm text-slate-500 text-center mt-6">
                Remembered your password?{" "}
                <Link href="/login" className="text-primary-light hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
