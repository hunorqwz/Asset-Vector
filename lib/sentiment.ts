import { GoogleGenerativeAI } from "@google/generative-ai";
import { NarrativeArticle } from "./types";

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
  velocity: number; // Rate of change in sentiment (-2 to 2)
}

// Institutional Keyword Sets for High-Precision Heuristics
const POSITIVE_KEYWORDS = new Set(["surge", "record", "high", "jump", "rally", "gain", "strong", "beat", "outperform", "buy", "growth", "optimism", "momentum", "bull", "stable", "upside", "expansion", "profit", "dividend", "acquisition"]);
const NEGATIVE_KEYWORDS = new Set(["drop", "plunge", "fall", "crash", "miss", "weak", "loss", "warning", "bear", "sell", "concern", "risk", "debt", "drag", "slowdown", "downside", "inflation", "cut", "downgrade", "scandal"]);

export class SentimentFallback {
  static analyze(heads: NarrativeArticle[]): SentimentReport {
    if (heads.length === 0) {
      return { score: 0, label: "NEUTRAL", headlineCount: 0, drivers: [], drift: "STABLE", velocity: 0 };
    }

    let weightedScore = 0;
    let totalWeight = 0;
    let bullCount = 0;
    let bearCount = 0;
    const kwMap = new Map<string, number>();

    // 1. Initial Scoring & Keyword Mapping
    heads.forEach(article => {
      let localScore = 0;
      const tokens = article.title.toLowerCase().match(/[a-z0-9._-]+/g) || [];
      tokens.forEach(w => {
        if (POSITIVE_KEYWORDS.has(w)) {
          localScore++;
          kwMap.set(w, (kwMap.get(w) || 0) + 1);
        }
        if (NEGATIVE_KEYWORDS.has(w)) {
          localScore--;
          kwMap.set(w, (kwMap.get(w) || 0) + 1);
        }
      });
      (article as any)._localScore = localScore;
    });

    // 2. Velocity Calculation (Delta over the last 12h)
    const recentHeads = heads.filter(h => ageInHours(h.date) <= 12);
    const baselineHeads = heads.filter(h => ageInHours(h.date) > 12 && ageInHours(h.date) <= 48);
    const recentAvg = recentHeads.length > 0 ? recentHeads.reduce((s, h) => s + ((h as any)._localScore || 0), 0) / recentHeads.length : 0;
    const baselineAvg = baselineHeads.length > 0 ? baselineHeads.reduce((s, h) => s + ((h as any)._localScore || 0), 0) / baselineHeads.length : 0;
    const velocity = Number((recentAvg - baselineAvg).toFixed(2));

    // 3. Weighted Aggregation (Time-Decay)
    heads.forEach(article => {
      const localScore = (article as any)._localScore || 0;
      const ageHours = ageInHours(article.date);
      const timeWeight = Math.max(0.1, 1 / (1 + ageHours / 24));
      weightedScore += localScore * timeWeight;
      totalWeight += timeWeight;
      if (localScore > 0) bullCount++;
      else if (localScore < 0) bearCount++;
    });

    const totalSentimentBars = bullCount + bearCount;
    const agreement = totalSentimentBars > 0 ? Math.abs(bullCount - bearCount) / totalSentimentBars : 1;
    let score = totalWeight > 0 ? weightedScore / (totalWeight * 0.5 + 1) : 0;
    score = Math.max(-1, Math.min(1, score * agreement));

    const sorted = Array.from(kwMap.entries()).sort((a, b) => b[1] - a[1]);
    const drivers = sorted.slice(0, 3).map(([word]) => ({
      driver: `Narrative focus on "${word}"`,
      impact: POSITIVE_KEYWORDS.has(word) ? "BULLISH" : "BEARISH"
    })) as NarrativeDriver[];

    let drift: SentimentReport['drift'] = "STABLE";
    if (agreement < 0.4 && totalSentimentBars >= 2) drift = "REVERSAL";
    else if (score > 0.4) drift = "ACCELERATING_BULL";
    else if (score < -0.4) drift = "ACCELERATING_BEAR";

    return {
      score: Number(score.toFixed(2)),
      label: score > 0.2 ? "BULLISH" : (score < -0.2 ? "BEARISH" : "NEUTRAL"),
      headlineCount: heads.length,
      drivers: drivers.length > 0 ? drivers : [{ driver: "General Market Narrative", impact: "NEUTRAL" }],
      drift,
      velocity
    };
  }
}

function ageInHours(date: string): number {
  return (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60);
}

export class SentimentAnalyzer {
  static async analyzeAsync(ticker: string, heads: NarrativeArticle[]): Promise<SentimentReport> {
    if (!heads || heads.length === 0) {
      return { score: 0, label: "NEUTRAL", headlineCount: 0, drivers: [], drift: "STABLE", velocity: 0 };
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return SentimentFallback.analyze(heads);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: "You are an institutional Quant Sentiment API. Respond with strict JSON matching the requested schema. No markdown wrapping. Just pure JSON."
      });

      const prompt = `
Analyze the recent narrative for ${ticker} based on these headlines:
${heads.slice(0, 5).map(h => h.title).join(" | ")}

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
        drift: parsed.drift || "STABLE",
        velocity: SentimentFallback.analyze(heads).velocity // Use heuristic velocity for precision 
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
