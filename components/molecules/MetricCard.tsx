export function MetricCard({ label, value, subValue, trend }: { label: string; value: string; subValue?: string; trend?: "BULLISH" | "BEARISH" }) {
  const isBull = trend === "BULLISH";
  const isBear = trend === "BEARISH";

  return (
    <div className="group p-5 flex flex-col justify-between h-full bg-[#070707] border border-white/5 -ml-px -mt-px first:ml-0 hover:bg-[#0c0c0c] transition-all relative overflow-hidden">
      {/* Surgical Top-Accent Bar */}
      <div className={`absolute top-0 left-0 w-full h-[2px] transition-transform duration-500 scale-x-0 group-hover:scale-x-100 ${isBull ? 'bg-bull' : isBear ? 'bg-bear' : 'bg-zinc-500/30'}`} />
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-3 group-hover:text-zinc-400 transition-colors">{label}</span>
        <span className="text-[18px] font-mono font-bold text-white tabular-nums tracking-tighter block leading-none">{value}</span>
      </div>
      {subValue && (
        <span className={`text-[10px] font-mono font-bold mt-3 tabular-nums uppercase tracking-widest ${isBull ? 'text-bull' : isBear ? 'text-bear' : 'text-zinc-500'}`}>
          {subValue}
        </span>
      )}
    </div>
  );
}
