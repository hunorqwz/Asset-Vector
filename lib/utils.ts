/**
 * Core Utility Engine
 * Shared sanitization and transformation helpers.
 */

export const safeNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

export const safeStr = (v: any, fallback = ""): string => {
  return (v === null || v === undefined) ? fallback : String(v);
};

export const safeDate = (v: any): string | null => {
  if (!v) return null;
  try {
    const d = v instanceof Date ? v : (typeof v === "number" ? new Date(v * 1000) : new Date(v));
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  } catch {
    return null;
  }
};

/**
 * High-performance array deduplication by key.
 */
export function uniqueBy<T>(arr: T[], key: keyof T): T[] {
  return Array.from(new Map(arr.map(item => [item[key], item])).values());
}
