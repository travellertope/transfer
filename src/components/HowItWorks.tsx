"use client";

import { Upload, ArrowRightLeft, Download, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Enter Source Server",
    description:
      "Provide the FTP credentials and file path for the server you want to copy FROM.",
  },
  {
    icon: Download,
    title: "Enter Destination Server",
    description:
      "Provide the FTP credentials and path for the server you want to send the file TO.",
  },
  {
    icon: ArrowRightLeft,
    title: "We Stream Directly",
    description:
      "Our server opens a read-stream from source and a write-stream to destination. Data flows server-to-server — never touches your machine.",
  },
  {
    icon: CheckCircle,
    title: "Done. File Transferred.",
    description:
      "Get a confirmation with total bytes transferred. Your 3GB+ file is on the new server.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Four steps. No software to install. No files on your local machine.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-primary/40 to-transparent z-0" />
              )}
              <div className="glass-card rounded-2xl p-6 relative z-10 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-primary-light" />
                </div>
                <div className="text-xs text-primary-light font-mono mb-2">
                  STEP {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
