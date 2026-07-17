"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does server-to-server transfer work?",
    a: "We open a read-stream from your source FTP server and a write-stream to your destination server. Data flows directly between them through our relay — it never touches your local machine or browser. Think of it as piping data through a tunnel.",
  },
  {
    q: "What's the maximum file size?",
    a: "On the Free plan, up to 800MB. Pro supports 10GB, and Enterprise has no limit. The underlying streaming architecture can handle files of any size — it streams data directly from source to destination instead of buffering it in memory, so memory usage stays constant regardless of file size.",
  },
  {
    q: "Are my FTP credentials safe?",
    a: "Yes. Your credentials are sent over HTTPS to our server, used only for the duration of the active transfer session, and immediately discarded. We never write credentials to disk, logs, or any persistent storage.",
  },
  {
    q: "Can I transfer between different hosting providers?",
    a: "Absolutely. That's the primary use case. Moving files from GoDaddy to SiteGround, from Bluehost to DigitalOcean, between any two servers with FTP access — it all works the same way.",
  },
  {
    q: "What protocols are supported?",
    a: "The Free plan supports standard FTP. Pro and Enterprise plans add SFTP (SSH File Transfer Protocol) support for encrypted transfers. We recommend SFTP whenever available.",
  },
  {
    q: "What happens if the transfer is interrupted?",
    a: "If the connection drops, you'll see an error status. Simply start a new transfer — we don't create partial files that could cause issues. Pro plans include automatic retry logic.",
  },
  {
    q: "Do I need to keep the browser tab open?",
    a: "No. Once you initiate the transfer, the stream runs on our server independently. You can close the tab and check the destination server later. Pro plans include email/webhook notifications on completion.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-slate-900 dark:text-white font-medium pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
