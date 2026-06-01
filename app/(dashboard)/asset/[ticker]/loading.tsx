export default function Loading() {
  return (
    <div className="w-full h-full min-h-[50vh] flex items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4 border border-matrix/20 p-8">
        <div className="text-matrix font-mono text-sm tracking-widest animate-pulse">
          _ ESTABLISHING UPLINK...
        </div>
        <div className="w-64 h-1 border border-matrix/30 bg-black overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-matrix w-1/3 animate-shimmer" />
        </div>
        <div className="text-zinc-600 font-mono text-[10px] uppercase mt-2">
          Decrypting Market Telemetry
        </div>
      </div>
    </div>
  );
}
