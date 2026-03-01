"use server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function debugTableSignals() {
  try {
    const res = await db.execute(sql`SELECT ticker, direction, is_evaluated, accuracy_score FROM market_signals LIMIT 10`);
    console.log("[Debug Table] Results:", res.rows);
    return res.rows;
  } catch (err) {
    console.error("[Debug Table] Error:", err);
    return null;
  }
}
