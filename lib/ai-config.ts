// ─────────────────────────────────────────────────────────────────────────────
// AI MODEL SELECTION — ASSET VECTOR
// ─────────────────────────────────────────────────────────────────────────────
// Model: gemini-2.5-flash-lite
//
// WHY THIS MODEL:
//   1. COST EFFICIENCY: At $0.10/1M input and $0.40/1M output tokens, it is
//      the cheapest production-ready model in Google's 2.5 generation lineup —
//      significantly cheaper than the deprecated 1.5-flash or 2.0-flash.
//
//   2. PRECISION FOR OUR USE CASE: Our AI tasks (sentiment scoring, price
//      scenario generation, earnings tone analysis) are structured JSON tasks
//      with well-defined schemas. They do NOT require frontier-level reasoning.
//      Flash-Lite handles all of them with high accuracy.
//
//   3. MODERN KNOWLEDGE CUTOFF: January 2025 training data — vs the deprecated
//      gemini-1.5-flash which was cut off in November 2023. This means accurate
//      awareness of recent company events, narratives, and market conditions.
//
//   4. AGGRESSIVE CACHING: Our global systemKv cache (1h TTL for sentiment,
//      24h TTL for strategic/forensic analysis) means each model call fires
//      at most once per TTL window per ticker, regardless of user count.
//      Estimated cost: ~$1.65/month for a typical personal/small deployment.
//
//   5. NO OVER-ENGINEERING: Using a more expensive model (Flash or Pro tier)
//      would yield negligible quality improvement on short structured prompts
//      while multiplying costs 3-12x unnecessarily.
//
// NOTE: This file is intentionally separate from app/actions/ai.ts because
//   Next.js "use server" files may ONLY export async functions. Exporting a
//   plain constant from a server action file causes a runtime error. This
//   shared config module is the single source of truth for the AI model name.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_MODEL = "gemini-2.5-flash-lite" as const;
