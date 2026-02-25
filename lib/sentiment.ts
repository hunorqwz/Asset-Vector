export interface SentimentReport {
  score: number;
  label: "BULLISH" | "BEARISH" | "NEUTRAL";
  keywords: { word: string; weight: number }[];
  headlineCount: number;
}

export class SentimentAnalyzer {
  private static POS = new Set(["surge", "record", "high", "jump", "rally", "gain", "strong", "beat", "outperform", "buy", "growth", "optimism", "momentum", "bull", "stable", "upside"]);
  private static NEG = new Set(["drop", "plunge", "fall", "crash", "miss", "weak", "loss", "warning", "bear", "sell", "concern", "risk", "debt", "drag", "slowdown", "downside"]);

  static analyze(heads: string[]): SentimentReport {
    let s = 0;
    const kwMap = new Map<string, number>();

    heads.forEach(h => h.toLowerCase().split(/\W+/).forEach(w => {
      if (this.POS.has(w)) {
        s++;
        kwMap.set(w, (kwMap.get(w) || 0) + 1);
      }
      if (this.NEG.has(w)) {
        s--;
        kwMap.set(w, (kwMap.get(w) || 0) + 1);
      }
    }));

    const score = heads.length ? Math.max(-1, Math.min(1, s / (heads.length * 0.5 + 1))) : 0;
    const keywords = Array.from(kwMap.entries())
      .map(([word, count]) => ({ word, weight: count }))
      .sort((a, b) => b.weight - a.weight);

    return {
      score,
      label: this.getLabel(score),
      keywords,
      headlineCount: heads.length
    };
  }

  static getLabel(s: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
    return s > 0.2 ? "BULLISH" : (s < -0.2 ? "BEARISH" : "NEUTRAL");
  }

  static getImpact(s: number): string {
    if (Math.abs(s) < 0.2) return "Negligible liquidity impact from narrative.";
    if (Math.abs(s) < 0.5) return "Significant retail narrative shift detected.";
    return "Institutional narrative pivot in progress.";
  }
}
