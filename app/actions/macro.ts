"use server";

import { getMacroSnapshot, MacroSnapshot } from "@/lib/macro-analysis";

/**
 * Server Action to fetch macroeconomic intelligence.
 * Includes caching and regime analysis.
 */
export async function getMacroIntelligence(): Promise<MacroSnapshot> {
  return await getMacroSnapshot();
}
