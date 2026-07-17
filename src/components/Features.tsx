"use client";

import {
  Globe,
  HardDrive,
  Clock,
  ShieldCheck,
  Gauge,
  RefreshCw,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Server-to-Server Direct",
    description:
      "Data streams directly between FTP servers. Your browser just kicks it off — nothing is downloaded to your machine.",
  },
  {
    icon: HardDrive,
    title: "3GB+ File Support",
    description:
      "Built for massive files. Backups, databases, media archives — transfer gigabytes without breaking a sweat.",
  },
  {
    icon: Clock,
    title: "Set It & Forget It",
    description:
      "Start the transfer and walk away. Our server handles the stream. Check back for a completion confirmation.",
  },
  {
    icon: ShieldCheck,
    title: "Credentials Never Stored",
    description:
      "FTP credentials are used for the active session only. Nothing is written to disk or logged. Ever.",
  },
  {
    icon: Gauge,
    title: "Chunked Streaming",
    description:
      "Data streams straight from source to destination in a continuous pipe instead of being buffered in memory, so transfer size isn't limited by available RAM.",
  },
  {
    icon: RefreshCw,
    title: "Migration-Ready",
    description:
      "Perfect for website migrations, server moves, and backup distribution. Move wp-content, databases, and archives between hosts.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-slate-50 dark:bg-surface/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Built for <span className="gradient-text">Heavy Lifting</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Every feature is designed around one goal: moving large files
            between servers as fast and reliably as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-light" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
