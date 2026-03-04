"use server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { OHLCV, NarrativeArticle } from "@/lib/types";
import { AI_MODEL } from "@/lib/ai-config";
import { db } from "@/db";
import { systemKv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SentimentAnalyzer, SentimentReport, SentimentFallback } from "@/lib/sentiment";
import { ForensicEarningsReport } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const activeRequests = new Map<string, Promise<StrategicInsight | null>>();
const activeSentimentRequests = new Map<string, Promise<SentimentReport>>();
const activeEarningsRequests = new Map<string, Promise<ForensicEarningsReport | null>>();

async function getGlobalCache<T>(key: string): Promise<T | null> {
  try {
    const row = await db.query.systemKv.findFirst({ where: eq(systemKv.key, key) });
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) return null;
    return row.value as T;
  } catch (e) {
    console.error("Global Cache Read Error:", e);
    return null;
  }
}

async function setGlobalCache<T>(key: string, value: T, ttlMs: number) {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db.insert(systemKv).values({ key, value: value as any, expiresAt })
      .onConflictDoUpdate({ target: systemKv.key, set: { value: value as any, expiresAt } });
  } catch (e) {
    console.error("Global Cache Write Error:", e);
  }
}

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

export async function generateStrategicAnalysis(ticker: string, history: OHLCV[], news: NarrativeArticle[]): Promise<StrategicInsight | null> {
  const cacheKey = `ai_strategy_${ticker}`;
  const cached = await getGlobalCache<StrategicInsight | string>(cacheKey);
  if (cached) return cached === "COOLDOWN" ? null : cached as StrategicInsight;

  if (activeRequests.has(ticker)) return activeRequests.get(ticker)!;

  const promise = (async (): Promise<StrategicInsight | null> => {
    if (!history.length) return null;
    let retries = 0;
    while (retries <= 2) {
      try {
        const model = genAI.getGenerativeModel({ model: AI_MODEL, systemInstruction: "Institutional Quant Analyst. Output strictly valid JSON." });
        const recent = history.slice(-30).map(h => ({ d: new Date(h.time * 1000).toISOString().split('T')[0], c: h.close, v: h.volume }));
        
        const responseSchema = {
          type: SchemaType.OBJECT,
          properties: {
            patternRecognition: { type: SchemaType.OBJECT, properties: { form: { type: SchemaType.STRING }, confidence: { type: SchemaType.NUMBER }, implication: { type: SchemaType.STRING } }, required: ["form", "confidence", "implication"] },
            sentiment: { type: SchemaType.OBJECT, properties: { bias: { type: SchemaType.STRING }, score: { type: SchemaType.NUMBER }, drivers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, nuance: { type: SchemaType.STRING } }, required: ["bias", "score", "drivers", "nuance"] },
            scenarios: {
              type: SchemaType.OBJECT,
              properties: {
                conservative: { type: SchemaType.OBJECT, properties: { shortTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } }, midTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } }, longTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } } } },
                balanced: { type: SchemaType.OBJECT, properties: { shortTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } }, midTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } }, longTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } } } },
                aggressive: { type: SchemaType.OBJECT, properties: { shortTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } }, midTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } }, longTerm: { type: SchemaType.OBJECT, properties: { priceTarget: { type: SchemaType.NUMBER }, probability: { type: SchemaType.NUMBER }, rationale: { type: SchemaType.STRING } } } } }
              }, required: ["conservative", "balanced", "aggressive"]
            },
            riskAnalysis: { type: SchemaType.STRING }
          },
          required: ["patternRecognition", "sentiment", "scenarios", "riskAnalysis"]
        } as any;

        const prompt = `Analyze ${ticker}. Data: ${JSON.stringify(recent)}. News: ${news.slice(0, 5).map(n => n.title).join(" | ")}. Limit to highly precise answers.`;
        const res = await model.generateContent({
           contents: [{ role: "user", parts: [{ text: prompt }] }],
           generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema }
        });
        const parsed = JSON.parse(res.response.text()) as StrategicInsight;
        await setGlobalCache(cacheKey, parsed, 86400000); // 24 HOURS TTL
        return parsed;
      } catch (err: any) {
        console.error("generateStrategicAnalysis error:", err);
        const msg = (err?.message || "").toLowerCase();
        if (err?.status === 429 || msg.includes("rate limit") || msg.includes("quota")) {
          retries++;
          if (retries <= 2) { await new Promise(r => setTimeout(r, 2000 * Math.pow(2, retries - 1))); continue; }
          await setGlobalCache(cacheKey, "COOLDOWN", 60000);
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

export async function extractSentimentNarrative(ticker: string, headlines: NarrativeArticle[]): Promise<SentimentReport> {
  const cacheKey = `ai_sentiment_extraction_${ticker}`;
  const cached = await getGlobalCache<SentimentReport | string>(cacheKey);
  
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
      await setGlobalCache(cacheKey, res, 3600000); // 1 HOUR TTL
      return res;
    } catch (e) {
      await setGlobalCache(cacheKey, "COOLDOWN", 60000);
      return SentimentFallback.analyze(headlines);
    }
  })();

  activeSentimentRequests.set(ticker, promise);
  try { return await promise; } finally { activeSentimentRequests.delete(ticker); }
}

export async function generateForensicEarningsAnalysis(ticker: string, news: NarrativeArticle[]): Promise<ForensicEarningsReport | null> {
  const cacheKey = `ai_earnings_${ticker}`;
  const cached = await getGlobalCache<ForensicEarningsReport | string>(cacheKey);
  if (cached) return cached === "COOLDOWN" ? null : cached as ForensicEarningsReport;

  if (activeEarningsRequests.has(ticker)) return activeEarningsRequests.get(ticker)!;

  const promise = (async (): Promise<ForensicEarningsReport | null> => {
    try {
      const model = genAI.getGenerativeModel({ 
        model: AI_MODEL, 
        systemInstruction: "Forensic Equity Analyst. You analyze earnings narrative for subtle 'tells', management confidence, and hidden risks. Output strictly valid JSON." 
      });

      const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
          sentimentShift: { 
            type: SchemaType.OBJECT, 
            properties: { 
              direction: { type: SchemaType.STRING, enum: ["IMPROVING", "DETERIORATING", "STABLE"] },
              rationale: { type: SchemaType.STRING }
            },
            required: ["direction", "rationale"]
          },
          guidanceQuality: {
            type: SchemaType.OBJECT,
            properties: {
              score: { type: SchemaType.NUMBER },
              tone: { type: SchemaType.STRING },
              skepticism: { type: SchemaType.STRING }
            },
            required: ["score", "tone", "skepticism"]
          },
          hiddenRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          keyAlphaDrivers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          managementConfidence: { type: SchemaType.NUMBER }
        },
        required: ["sentimentShift", "guidanceQuality", "hiddenRisks", "keyAlphaDrivers", "managementConfidence"]
      } as any;

      const prompt = `Perform forensic earnings analysis for ${ticker} based on recent headlines and analyst summaries: ${news.slice(0, 8).map(n => n.title).join(" | ")}. Search for subtle shifts in guidance tone and under-the-radar obstacles.`;
      
      const res = await model.generateContent({
         contents: [{ role: "user", parts: [{ text: prompt }] }],
         generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema }
      });
      
      const parsed = JSON.parse(res.response.text()) as ForensicEarningsReport;
      await setGlobalCache(cacheKey, parsed, 86400000); // 24 HOURS
      return parsed;
    } catch (err: any) {
      console.error("generateForensicEarningsAnalysis error:", err);
      // Fallback to cooldown if rate limited
      if (err?.status === 429) await setGlobalCache(cacheKey, "COOLDOWN", 60000);
      return null;
    }
  })();

  activeEarningsRequests.set(ticker, promise);
  try { return await promise; } finally { activeEarningsRequests.delete(ticker); }
}
