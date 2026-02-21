"use client";

import { useState } from "react";
import { ArrowRightLeft, Menu, X } from "lucide-react";

const links = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-lg border-b border-slate-800/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-primary-light" />
          </div>
          <span className="text-lg font-bold text-white">StreamTransfer</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#transfer"
            className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
          >
            Start Transfer
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-slate-400"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-slate-800 px-6 py-4 space-y-3">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-slate-400 hover:text-white transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#transfer"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-5 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
          >
            Start Transfer
          </a>
        </div>
      )}
    </nav>
  );
}
