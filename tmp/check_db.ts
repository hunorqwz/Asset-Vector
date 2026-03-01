"use server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function checkSignalsTable() {
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'signals'
    `);
    console.log("[Table Info] signals columns:", res.rows);
    return res.rows;
  } catch (error) {
    console.error("[Table Info] Error:", error);
    return null;
  }
}
