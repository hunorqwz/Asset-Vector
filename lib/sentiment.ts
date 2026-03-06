import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { NarrativeArticle } from "./types";
import { AI_MODEL } from "@/lib/ai-config";

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
  isInsufficientData?: boolean; // True if news volume is too low for reliable AI/Heuristic analysis
  integrityScore: number; // 0 to 1 (Narrative reliability)
  isConflicted: boolean; // True if outliers lack institutional consensus
}

// Institutional Keyword Sets for High-Precision Heuristics
const POSITIVE_KEYWORDS = new Set(["surge", "record", "high", "jump", "rally", "gain", "strong", "beat", "outperform", "buy", "growth", "optimism", "momentum", "bull", "stable", "upside", "expansion", "profit", "dividend", "acquisition"]);
const NEGATIVE_KEYWORDS = new Set(["drop", "plunge", "fall", "crash", "miss", "weak", "loss", "warning", "bear", "sell", "concern", "risk", "debt", "drag", "slowdown", "downside", "inflation", "cut", "downgrade", "scandal"]);

// Institutional Source Reliability Map (Narrative Integrity Guard)
const SOURCE_RELIABILITY: Record<string, number> = {
  "bloomberg": 1.5,
  "reuters": 1.5,
  "ft.com": 1.4,
  "wsj.com": 1.4,
  "cnbc": 1.1,
  "benzinga": 0.8,
  "yahoo finance": 1.0,
  "marketwatch": 1.0,
  "seeking alpha": 0.7, // High retail influence
  "motley fool": 0.6,
  "investing.com": 0.8,
  "coindesk": 1.2, // Authoritative for crypto
  "cointelegraph": 0.9
};

export class SentimentFallback {
  static analyze(heads: NarrativeArticle[]): SentimentReport {
    if (heads.length === 0) {
      return { 
        score: 0, 
        label: "NEUTRAL", 
        headlineCount: 0, 
        drivers: [], 
        drift: "STABLE", 
        velocity: 0,
        isInsufficientData: true,
        integrityScore: 1.0,
        isConflicted: false
      };
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

      // Narrative Integrity: Source Weighting
      const sourceKey = article.publisher?.toLowerCase() || "unknown";
      const sourceWeight = Object.entries(SOURCE_RELIABILITY).find(([k]) => sourceKey.includes(k))?.[1] || 0.8;
      
      (article as any)._localScore = localScore;
      (article as any)._sourceWeight = sourceWeight;
    });

    // 1.1 Narrative Conflict Analysis (Surgical Outlier Detection)
    // If a high-impact headline exists without ANY confirmation from high-reliability sources, it's a conflict.
    const highReliabilityHeads = heads.filter(h => (h as any)._sourceWeight >= 1.2);
    const hasConsensus = highReliabilityHeads.length > 0;
    let conflictCount = 0;
    
    heads.forEach(article => {
      const localScore = (article as any)._localScore || 0;
      const weight = (article as any)._sourceWeight || 1.0;
      
      // If it's a "Screamer" (score > 3) but lacks high-reliability consensus, slash its weight by 70%
      if (Math.abs(localScore) >= 3 && !hasConsensus && weight < 1.0) {
        (article as any)._sourceWeight = weight * 0.3;
        conflictCount++;
      }
    });

    const integrityScore = heads.length > 0 ? 
      heads.reduce((acc, h) => acc + ((h as any)._sourceWeight || 1), 0) / (heads.length * 1.5) : 1;

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
      const sourceWeight = (article as any)._sourceWeight || 1.0;
      
      weightedScore += localScore * timeWeight * sourceWeight;
      totalWeight += timeWeight * sourceWeight;
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
      velocity,
      integrityScore: Number(Math.min(1, integrityScore).toFixed(2)),
      isConflicted: conflictCount > 0 && !hasConsensus
    };
  }
}

function ageInHours(date: string): number {
  return (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60);
}

export class SentimentAnalyzer {
  static async analyzeAsync(ticker: string, heads: NarrativeArticle[]): Promise<SentimentReport> {
    if (!heads || heads.length === 0) {
      return { 
        score: 0, 
        label: "NEUTRAL", 
        headlineCount: 0, 
        drivers: [], 
        drift: "STABLE", 
        velocity: 0,
        isInsufficientData: true,
        integrityScore: 1.0,
        isConflicted: false
      };
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return SentimentFallback.analyze(heads);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: AI_MODEL,
        systemInstruction: "You are an institutional Quant Sentiment API. Respond with strict JSON matching the requested schema. No markdown wrapping. Just pure JSON."
      });

      const prompt = `Analyze the recent narrative for ${ticker} based on these headlines:
${heads.slice(0, 5).map(h => h.title).join(" | ")}

Limit output to 3 primary drivers maximum. Make drivers sound extremely professional (e.g. "Regulatory Headwinds" instead of "they got sued").`;

      const responseSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          score: { type: SchemaType.NUMBER },
          label: { type: SchemaType.STRING },
          drivers: { 
            type: SchemaType.ARRAY, 
            items: { 
              type: SchemaType.OBJECT, 
              properties: { 
                driver: { type: SchemaType.STRING }, 
                impact: { type: SchemaType.STRING } 
              }, 
              required: ["driver", "impact"] 
            } 
          },
          drift: { type: SchemaType.STRING }
        },
        required: ["score", "label", "drivers", "drift"]
      } as any;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      
      return {
        score: Number(parsed.score) || 0,
        label: parsed.label || "NEUTRAL",
        headlineCount: heads.length,
        drivers: parsed.drivers || [],
        drift: parsed.drift || "STABLE",
        velocity: SentimentFallback.analyze(heads).velocity, // Use heuristic velocity for precision 
        integrityScore: SentimentFallback.analyze(heads).integrityScore,
        isConflicted: SentimentFallback.analyze(heads).isConflicted
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
