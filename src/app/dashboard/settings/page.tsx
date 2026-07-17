"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, User, Lock, Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const inputClass =
  "w-full px-4 py-2.5 bg-white dark:bg-surface border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-sm";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={`flex items-start gap-2 text-sm mt-4 ${type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passStatus, setPassStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setProfileLoading(true);
    try {
      const res = await fetch("/api/auth/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileStatus({ type: "success", msg: "Profile updated." });
      } else {
        setProfileStatus({ type: "error", msg: data.error || "Update failed." });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus(null);
    if (newPass !== confirmPass) {
      setPassStatus({ type: "error", msg: "New passwords don't match." });
      return;
    }
    if (newPass.length < 8) {
      setPassStatus({ type: "error", msg: "Password must be at least 8 characters." });
      return;
    }
    setPassLoading(true);
    try {
      const res = await fetch("/api/auth/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        setPassStatus({ type: "success", msg: "Password changed successfully." });
        setCurrentPass(""); setNewPass(""); setConfirmPass("");
      } else {
        setPassStatus({ type: "error", msg: data.error || "Password change failed." });
      }
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your profile and security settings.</p>
      </div>

      {/* Profile */}
      <SettingsSection title="Profile" description="Update your display name and email address.">
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 mb-1">
              <User className="w-3.5 h-3.5" /> Display Name
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 mb-1">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
          </div>
          {profileStatus && <Alert type={profileStatus.type} message={profileStatus.msg} />}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={profileLoading} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl transition-colors">
              {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* Password */}
      <SettingsSection title="Change Password" description="Choose a strong password of at least 8 characters.">
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 mb-1">
              <Lock className="w-3.5 h-3.5" /> Current Password
            </label>
            <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} placeholder="••••••••" className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">New Password</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="At least 8 characters" className={inputClass} required minLength={8} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="••••••••" className={inputClass} required />
          </div>
          {passStatus && <Alert type={passStatus.type} message={passStatus.msg} />}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={passLoading} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl transition-colors">
              {passLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </div>
        </form>
      </SettingsSection>
    </div>
  );
}
