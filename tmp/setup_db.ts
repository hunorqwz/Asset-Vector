"use server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function ensureMarketSignalsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "market_signals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticker" varchar(10) NOT NULL,
        "generated_at" timestamp DEFAULT now(),
        "price_at_generation" numeric(18, 8),
        "score" numeric(5, 2),
        "signal_label" varchar(20),
        "direction" varchar(10),
        "confidence" numeric(10, 4),
        "snr" numeric(10, 4),
        "regime" varchar(50),
        "is_evaluated" boolean DEFAULT false,
        "outcome_price_7d" numeric(18, 8),
        "accuracy_score" numeric(5, 2)
      );
    `);
    console.log("[Setup] market_signals table verified/created.");
    return { success: true };
  } catch (error) {
    console.error("[Setup] Table creation error:", error);
    return { success: false, error: String(error) };
  }
}
