"use client";

import { useState } from "react";
import { registerUser } from "@/app/actions/auth";
import Link from "next/link";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("name", name);
    formData.append("password", password);

    try {
      const result = await registerUser(formData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-8 py-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-12 h-12 rounded-full border border-matrix/40 bg-matrix/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-matrix">
                <path d="M20 6 9 17l-5-5"/>
            </svg>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-white uppercase tracking-tightest">Account Created</h2>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
            Your account is ready. Sign in to access your dashboard.
          </p>
        </div>
        <Link 
          href="/login"
          className="w-full py-4 bg-matrix text-black font-black uppercase text-[12px] tracking-[0.3em] flex items-center justify-center hover:brightness-110 transition-all cursor-crosshair"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all placeholder-zinc-800"
          placeholder="Jane Smith"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all placeholder-identity@vector.io"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all placeholder-••••••••"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-bear/5 border border-bear/20 px-4 py-3 rounded-sm animate-in fade-in slide-in-from-top-2">
          <div className="w-1.5 h-1.5 rounded-full bg-bear animate-pulse shadow-bear" />
          <span className="text-[11px] font-bold text-bear uppercase tracking-widest leading-none">
            {error}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="relative py-4 bg-matrix text-black font-black uppercase text-[12px] tracking-[0.3em] overflow-hidden group hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale mt-2 cursor-crosshair"
      >
        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <span className="relative">
          {loading ? "Creating Account..." : "Create Account"}
        </span>
      </button>
    </form>
  );
}
