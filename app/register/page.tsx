import { Metadata } from "next";
import { RegisterForm } from "@/components/organisms/RegisterForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Account | Asset Vector",
  description: "Create your Asset Vector account to start tracking assets.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--matrix)/0.03,transparent_70%)]" />
      <div className="absolute inset-0 bg-[#070707] z-[-1]" />
      
      {/* Auth Terminal */}
      <div className="w-full max-w-lg px-8 relative z-10">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center bg-zinc-900/50 border border-white/10 mb-8 animate-in fade-in zoom-in duration-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
              <path d="M23 6l-9.5 9.5-5-5L1 18" />
              <path d="M17 6h6v6" />
            </svg>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-[1px] w-6 bg-matrix" />
              <span className="text-[10px] font-bold text-matrix tracking-[0.4em] uppercase">New Account</span>
              <div className="h-[1px] w-6 bg-matrix" />
            </div>
            <h1 className="text-4xl font-bold tracking-tightest text-white uppercase leading-[1.1]">
               Create Account
            </h1>
            <p className="text-[13px] text-zinc-500 font-medium text-center mt-3">Start tracking assets with precision intelligence</p>
          </div>
        </div>

        <div className="glass-card p-10 border border-white/5 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-matrix/10 to-transparent" />
          
          <div className="flex border-b border-white/10 mb-8">
            <Link href="/login" className="flex-1 pb-4 text-center border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all text-[11px] font-bold tracking-[0.2em] uppercase">
              Sign In
            </Link>
            <Link href="/register" className="flex-1 pb-4 text-center border-b-2 border-matrix text-matrix text-[11px] font-bold tracking-[0.2em] uppercase transition-all">
              Register
            </Link>
          </div>

          <RegisterForm />
          

        </div>

        <p className="mt-8 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] leading-relaxed">
           Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  );
}
