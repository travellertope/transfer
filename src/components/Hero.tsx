"use client";

import { ArrowRight, Zap, Server, Shield } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center hero-gradient pt-20">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary-light text-sm mb-8 animate-slide-up">
          <Zap className="w-4 h-4" />
          <span>Server-to-Server Streaming — No Middleman</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
          Move Massive Files
          <br />
          <span className="gradient-text">Between Servers</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up">
          Transfer multi-gigabyte files directly from one FTP server to another.
          No downloading to your machine. No storage limits. Just a direct
          stream that works while you do other things.
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
            className="px-8 py-4 border border-slate-600 hover:border-primary/50 text-slate-300 font-semibold rounded-xl transition-all duration-200"
          >
            See How It Works
          </a>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 animate-slide-up">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary-light" />
            <span>3GB+ file support</span>
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
