"use server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OHLCV } from "@/lib/market-data";
import { NewsArticle } from "@/lib/stock-details";
import { getFromCache, setInCache } from "@/lib/cache";
import { SentimentAnalyzer, SentimentReport, SentimentFallback } from "@/lib/sentiment";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const activeRequests = new Map<string, Promise<StrategicInsight | null>>();
const activeSentimentRequests = new Map<string, Promise<SentimentReport>>();

export interface StrategicInsight {
  patternRecognition: { form: string; confidence: number; implication: string };
  sentiment: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; drivers: string[]; nuance: string };
  scenarios: {
    conservative: { shortTerm: { priceTarget: number; probability: number; rationale: string }; midTerm: { priceTarget: number; probability: number; rationale: string }; longTerm: { priceTarget: number; probability: number; rationale: string } };
    balanced: { shortTerm: { priceTarget: number; probability: number; rationale: string }; midTerm: { priceTarget: number; probability: number; rationale: string }; longTerm: { priceTarget: number; probability: number; rationale: string } };
    aggressive: { shortTerm: { priceTarget: number; probability: number; rationale: string }; midTerm: { priceTarget: number; probability: number; rationale: string }; longTerm: { priceTarget: number; probability: number; rationale: string } };
  };
  riskAnalysis: string;
}

export async function generateStrategicAnalysis(ticker: string, history: OHLCV[], news: NewsArticle[]): Promise<StrategicInsight | null> {
  const cacheKey = `ai_strategy_${ticker}`;
  const cached = getFromCache<StrategicInsight | string>(cacheKey);
  if (cached) return cached === "COOLDOWN" ? null : cached as StrategicInsight;

  if (activeRequests.has(ticker)) return activeRequests.get(ticker)!;

  const promise = (async (): Promise<StrategicInsight | null> => {
    if (!history.length) return null;
    let retries = 0;
    while (retries <= 2) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: "Institutional Quant Analyst. Output strictly valid JSON." });
        const recent = history.slice(-30).map(h => ({ d: new Date(h.time * 1000).toISOString().split('T')[0], c: h.close, v: h.volume }));
        const schemaStr = `{
  "patternRecognition": { "form": "string", "confidence": "number 0-1", "implication": "string" },
  "sentiment": { "bias": "BULLISH|BEARISH|NEUTRAL", "score": "number -1 to 1", "drivers": ["string"], "nuance": "string" },
  "scenarios": {
    "conservative": { "shortTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" }, "midTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" }, "longTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" } },
    "balanced": { "shortTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" }, "midTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" }, "longTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" } },
    "aggressive": { "shortTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" }, "midTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" }, "longTerm": { "priceTarget": 0, "probability": 0, "rationale": "str" } }
  },
  "riskAnalysis": "string"
}`;
        const prompt = `Analyze ${ticker}. Data: ${JSON.stringify(recent)}. News: ${news.slice(0, 5).map(n => n.title).join(" | ")}. Match this exact JSON schema:\n${schemaStr}`;
        const res = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } });
        const parsed = JSON.parse(res.response.text()) as StrategicInsight;
        setInCache(cacheKey, parsed, 600000);
        return parsed;
      } catch (err: any) {
        console.error("generateStrategicAnalysis error:", err);
        const msg = (err?.message || "").toLowerCase();
        if (err?.status === 429 || msg.includes("rate limit") || msg.includes("quota")) {
          retries++;
          if (retries <= 2) { await new Promise(r => setTimeout(r, 2000 * Math.pow(2, retries - 1))); continue; }
          setInCache(cacheKey, "COOLDOWN", 60000);
        } else if (err instanceof SyntaxError) {
          retries++;
          if (retries <= 2) continue; // Retry JSON parse errors
        }
        break;
      }
    }
    return null;
  })();

  activeRequests.set(ticker, promise);
  try { return await promise; } finally { activeRequests.delete(ticker); }
}

export async function extractSentimentNarrative(ticker: string, headlines: string[]): Promise<SentimentReport> {
  const cacheKey = `ai_sentiment_extraction_${ticker}`;
  const cached = getFromCache<SentimentReport | string>(cacheKey);
  
  if (cached) {
    if (cached === "COOLDOWN") {
      return SentimentFallback.analyze(headlines);
    }
    return cached as SentimentReport;
  }

  if (activeSentimentRequests.has(ticker)) {
    return activeSentimentRequests.get(ticker)!;
  }

  const promise = (async () => {
    try {
      const res = await SentimentAnalyzer.analyzeAsync(ticker, headlines);
      setInCache(cacheKey, res, 600000);
      return res;
    } catch (e) {
      setInCache(cacheKey, "COOLDOWN", 60000);
      return SentimentFallback.analyze(headlines);
    }
  })();

  activeSentimentRequests.set(ticker, promise);
  try { return await promise; } finally { activeSentimentRequests.delete(ticker); }
}
