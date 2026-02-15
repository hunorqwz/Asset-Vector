export class SentimentAnalyzer {
  private static POSITIVE_TOKENS = new Set([
     "surge", "record", "high", "jump", "rally", "gain", "strong", "beat", "outperform", "buy", "growth", "optimism" 
  ]);
  
  private static NEGATIVE_TOKENS = new Set([
     "drop", "plunge", "fall", "crash", "miss", "weak", "loss", "warning", "bear", "sell", "concern", "risk", "debt"
  ]);

  /**
   * Quick heuristic for news sentiment.
   * @param headlines Strings from news feed.
   */
  static analyze(headlines: string[]): number {
    let score = 0;
    let count = 0;

    headlines.forEach(text => {
        const words = text.toLowerCase().split(/\W+/);
        words.forEach(w => {
            if (this.POSITIVE_TOKENS.has(w)) score += 1;
            if (this.NEGATIVE_TOKENS.has(w)) score -= 1;
        });
        count++;
    });

    if (count === 0) return 0;
    
    // Normalize to -1.0 to 1.0 (with sigmoid-like tempering)
    // Most news is neutral, so we amplify small signals
    const raw = score / (count * 0.5 + 1); 
    return Math.max(-1, Math.min(1, raw)); 
  }

  static getLabel(score: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
      if (score > 0.3) return "BULLISH";
      if (score < -0.3) return "BEARISH";
      return "NEUTRAL";
  }
}
