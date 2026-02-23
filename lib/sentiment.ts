export class SentimentAnalyzer {
  private static POS = new Set(["surge", "record", "high", "jump", "rally", "gain", "strong", "beat", "outperform", "buy", "growth", "optimism"]);
  private static NEG = new Set(["drop", "plunge", "fall", "crash", "miss", "weak", "loss", "warning", "bear", "sell", "concern", "risk", "debt"]);

  static analyze(heads: string[]): number {
    let s = 0; heads.forEach(h => h.toLowerCase().split(/\W+/).forEach(w => {
      if (this.POS.has(w)) s++; if (this.NEG.has(w)) s--;
    }));
    return heads.length ? Math.max(-1, Math.min(1, s / (heads.length * 0.5 + 1))) : 0;
  }

  static getLabel(s: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
    return s > 0.3 ? "BULLISH" : (s < -0.3 ? "BEARISH" : "NEUTRAL");
  }
}
