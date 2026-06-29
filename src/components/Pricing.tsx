"use client";

import { Check, Zap, Building2, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for one-off migrations",
    icon: Sparkles,
    features: [
      "3 transfers per month",
      "Up to 1GB per file",
      "Standard FTP",
      "Basic transfer logs",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For developers & sysadmins",
    icon: Zap,
    features: [
      "Unlimited transfers",
      "Up to 10GB per file",
      "FTP + SFTP support",
      "Priority queue",
      "Transfer history",
      "Webhook notifications",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For agencies & hosting companies",
    icon: Building2,
    features: [
      "Everything in Pro",
      "Unlimited file size",
      "Concurrent transfers",
      "API access",
      "Team accounts",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-slate-50 dark:bg-surface/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Simple, Honest <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Start free. Upgrade when you need more power. No surprise fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 relative ${
                plan.highlight
                  ? "glass-card border-primary/40 ring-1 ring-primary/20"
                  : "glass-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                <plan.icon className="w-5 h-5 text-primary-light" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  {plan.price}
                </span>
                <span className="text-slate-500 ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary-light mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                  plan.highlight
                    ? "bg-primary hover:bg-primary-dark text-white"
                    : "border border-slate-300 dark:border-slate-600 hover:border-primary/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
