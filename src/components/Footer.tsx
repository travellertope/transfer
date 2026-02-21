"use client";

import { ArrowRightLeft } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-primary-light" />
            </div>
            <span className="text-lg font-bold text-white">StreamTransfer</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Support
            </a>
          </div>

          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} StreamTransfer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
