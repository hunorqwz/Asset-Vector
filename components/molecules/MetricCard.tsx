export function MetricCard({ label, value, subValue, trend }: { label: string; value: string; subValue?: string; trend?: "BULLISH" | "BEARISH" }) {
  const isBull = trend === "BULLISH";
  const isBear = trend === "BEARISH";

  return (
    <div className="p-4 flex flex-col justify-between h-full bg-[#0a0a0a] border border-white/10 -ml-px -mt-px first:ml-0 hover:bg-[#111111] transition-colors">
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">{label}</span>
        <span className="text-[17px] font-mono font-bold text-white tabular-nums tracking-tight block leading-none">{value}</span>
      </div>
      {subValue && (
        <span className={`text-[11px] font-mono font-bold mt-2 tabular-nums ${isBull ? 'text-bull' : isBear ? 'text-bear' : 'text-zinc-500'}`}>
          {subValue}
        </span>
      )}
    </div>
  );
}
