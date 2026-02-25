import { GoogleGenerativeAI } from "@google/generative-ai";

export interface NarrativeDriver {
  driver: string;
  impact: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface SentimentReport {
  score: number; // -1 to 1
  label: "BULLISH" | "BEARISH" | "NEUTRAL";
  headlineCount: number;
  drivers: NarrativeDriver[];
  drift: "STABLE" | "ACCELERATING_BULL" | "ACCELERATING_BEAR" | "REVERSAL";
}

// Fallback logic for when rate-limits or API errors occur
export class SentimentFallback {
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
    const sorted = Array.from(kwMap.entries()).sort((a, b) => b[1] - a[1]);
    
    // Map top 3 keywords to generic drivers
    const drivers = sorted.slice(0, 3).map(([word]) => ({
      driver: `Mention of "${word}"`,
      impact: this.POS.has(word) ? "BULLISH" : "BEARISH"
    })) as NarrativeDriver[];

    return {
      score,
      label: this.getLabel(score),
      headlineCount: heads.length,
      drivers: drivers.length > 0 ? drivers : [{ driver: "General Market Activity", impact: "NEUTRAL" }],
      drift: "STABLE"
    };
  }

  private static getLabel(s: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
    return s > 0.2 ? "BULLISH" : (s < -0.2 ? "BEARISH" : "NEUTRAL");
  }
}

export class SentimentAnalyzer {
  static async analyzeAsync(ticker: string, heads: string[]): Promise<SentimentReport> {
    if (!heads || heads.length === 0) {
      return { score: 0, label: "NEUTRAL", headlineCount: 0, drivers: [], drift: "STABLE" };
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return SentimentFallback.analyze(heads);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are an institutional Quant Sentiment API. Respond with strict JSON matching the requested schema. No markdown wrapping. Just pure JSON."
      });

      const prompt = `
Analyze the recent narrative for ${ticker} based on these headlines:
${heads.slice(0, 5).join(" | ")}

Output strict JSON object matching this TypeScript interface exactly:
{
  "score": number, // -1 (extremely bearish) to 1 (extremely bullish)
  "label": "BULLISH" | "BEARISH" | "NEUTRAL",
  "drivers": [
    { "driver": "string describing the specific fundamental or narrative driver from news", "impact": "BULLISH" | "BEARISH" | "NEUTRAL" }
  ],
  "drift": "STABLE" | "ACCELERATING_BULL" | "ACCELERATING_BEAR" | "REVERSAL"
}
Limit output to 3 primary drivers maximum. Make drivers sound extremely professional (e.g. "Regulatory Headwinds" instead of "they got sued").
      `;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });
      
      const responseText = result.response.text();
      let parsed = JSON.parse(responseText);
      
      return {
        score: Number(parsed.score) || 0,
        label: parsed.label || "NEUTRAL",
        headlineCount: heads.length,
        drivers: parsed.drivers || [],
        drift: parsed.drift || "STABLE"
      };

    } catch (error) {
       console.error("Narrative Extraction AI Error, falling back to heuristic:", error);
       return SentimentFallback.analyze(heads);
    }
  }

  static getImpact(s: number): string {
    if (Math.abs(s) < 0.2) return "Negligible liquidity impact from narrative.";
    if (Math.abs(s) < 0.5) return "Significant retail narrative shift detected.";
    return "Institutional narrative pivot in progress.";
  }
}
