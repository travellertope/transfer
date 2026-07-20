"use client";

import { ArrowRight, Zap, Server, Shield } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20">
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white animate-slide-up">
          Move Massive Files
          <br />
          <span className="text-primary-light">Between Servers</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up">
          Transfer multi-gigabyte files directly between FTP and SFTP servers —
          or to and from Google Drive, OneDrive, and YouTube. No downloading to
          your machine. Just a direct stream that keeps running even after you
          close the tab.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up">
          <a
            href="#transfer"
            className="group flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 animate-pulse-glow"
          >
            Start a Transfer
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-slate-300 dark:border-slate-600 hover:border-primary/50 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all duration-200"
          >
            See How It Works
          </a>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-500 animate-slide-up">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary-light" />
            <span>Up to 10GB per file (Pro)</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-light" />
            <span>Encrypted connections</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-light" />
            <span>Direct stream — zero local storage</span>
          </div>
        </div>
      </div>
    </section>
  );
}
