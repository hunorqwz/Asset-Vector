"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
          Email
        </label>
        <div className="relative group/input">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all transition-duration-300 placeholder-zinc-800"
            placeholder="you@example.com"
          />
        </div>
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
          className="w-full bg-[#0a0a0a] border border-white/5 px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-matrix/40 focus:bg-matrix/5 transition-all transition-duration-300 placeholder-******"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-bear/5 border border-bear/20 px-4 py-3 rounded-sm group/error animate-in fade-in slide-in-from-top-2">
          <div className="w-1.5 h-1.5 rounded-full bg-bear animate-pulse shadow-bear" />
          <span className="text-[11px] font-bold text-bear uppercase tracking-widest leading-none">
            {error}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="relative py-4 bg-matrix text-black font-black uppercase text-[12px] tracking-[0.3em] overflow-hidden group hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale transition-duration-300 mt-2 cursor-crosshair"
      >
        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <span className="relative">
          {loading ? "Signing in..." : "Sign In"}
        </span>
      </button>

      <div className="flex items-center justify-center gap-4 mt-2 opacity-50">
        <div className="h-[1px] flex-1 bg-white/5" />
        <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest whitespace-nowrap">
           v2.4.0
        </span>
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>
    </form>
  );
}
