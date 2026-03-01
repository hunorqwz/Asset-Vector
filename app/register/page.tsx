import { Metadata } from "next";
import { RegisterForm } from "@/components/organisms/RegisterForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Identity Initialization | Alpha Vector",
  description: "Secure identity registration into the Alpha-Vector cluster.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--matrix)/0.03,transparent_70%)]" />
      <div className="absolute inset-0 bg-[#070707] z-[-1]" />
      
      {/* Surgical Terminal UI */}
      <div className="w-full max-w-lg px-8 relative z-10">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center glow-matrix bg-matrix/5 border-matrix/20 mb-8 animate-pulse">
            <div className="w-4 h-4 bg-matrix rounded-sm rotate-45 shadow-[0_0_20px_hsla(var(--matrix)/0.8)]" />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-[1px] w-6 bg-matrix" />
              <span className="text-[10px] font-bold text-matrix tracking-[0.4em] uppercase">Protocol Registration</span>
              <div className="h-[1px] w-6 bg-matrix" />
            </div>
            <h1 className="text-4xl font-bold tracking-tightest text-white uppercase leading-[1.1]">
               Identity<br/>Initialization
            </h1>
          </div>
        </div>

        <div className="glass-card p-10 border border-white/5 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/10 to-transparent" />
          
          <div className="flex border-b border-white/10 mb-8">
            <Link href="/login" className="flex-1 pb-4 text-center border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all text-[11px] font-bold tracking-[0.2em] uppercase cursor-crosshair">
              Authenticate
            </Link>
            <Link href="/register" className="flex-1 pb-4 text-center border-b-2 border-matrix text-matrix text-[11px] font-bold tracking-[0.2em] uppercase transition-all">
              Request Clearance
            </Link>
          </div>

          <RegisterForm />
          
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold font-mono">
              <span className="text-zinc-600">Access Tier:</span>
              <span className="text-matrix">Standard Node</span>
            </div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold font-mono">
              <span className="text-zinc-600">Sync Status:</span>
              <span className="text-zinc-400">Ready for Handshake</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] leading-relaxed">
           Welcome to the Alpha-Vector cluster. Once registered, your profile<br/>will be synced with surgical precision across all terminals.
        </p>
      </div>
    </div>
  );
}
