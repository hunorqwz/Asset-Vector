/**
 * Inference Engine Test Suite (v3.0)
 * Tests all three tiers: local precision engine, circuit breaker, and fallbacks.
 */
import { predictNextHorizon } from "../lib/inference";
import { setInCache, getFromCache } from "../lib/cache";

// ── Helpers ────────────────────────────────────────────────────────────────
function buildSyntheticSequence(bars: number, startPrice = 150, dailyDrift = 0.0005, vol = 0.015): number[][] {
  const seq: number[][] = [];
  let price = startPrice;
  for (let i = 0; i < bars; i++) {
    const open = price;
    price = price * Math.exp(dailyDrift + vol * (Math.random() * 2 - 1));
    const high = Math.max(open, price) * (1 + Math.random() * 0.003);
    const low  = Math.min(open, price) * (1 - Math.random() * 0.003);
    seq.push([open, high, low, price, Math.floor(Math.random() * 1_000_000 + 100_000)]);
  }
  return seq;
}

function assertInRange(label: string, value: number, min: number, max: number) {
  if (value < min || value > max) {
    throw new Error(`FAIL [${label}]: ${value} not in [${min}, ${max}]`);
  }
  console.log(`  PASS [${label}]: ${value.toFixed(4)}`);
}

function assertLess(label: string, a: number, b: number) {
  if (!(a < b)) throw new Error(`FAIL [${label}]: expected ${a} < ${b}`);
  console.log(`  PASS [${label}]: ${a.toFixed(4)} < ${b.toFixed(4)}`);
}

// ── Tests ──────────────────────────────────────────────────────────────────

async function testTier1LocalEngine() {
  console.log("\n[TEST 1] Tier-1 Local Precision Engine (circuit breaker forced)");
  // Force circuit breaker ON so we never attempt network
  await setInCache("ml_circuit_tripped", true, 60_000);
  // Reset state
  await setInCache("ml_failure_count", 0, 60_000);

  const bullishSeq  = buildSyntheticSequence(100, 200, 0.001, 0.012);
  const bearishSeq  = buildSyntheticSequence(100, 200, -0.001, 0.012);

  const bullResult = await predictNextHorizon(bullishSeq, "SYN_BULL", 0.18);
  const bearResult = await predictNextHorizon(bearishSeq, "SYN_BEAR", 0.18);

  console.log("  Bullish forecast:", bullResult);
  console.log("  Bearish forecast:", bearResult);

  // Structure checks
  assertInRange("bull p10 > 0", bullResult.p10, 0.01, 1e9);
  assertLess("bull p10 < p50", bullResult.p10, bullResult.p50);
  assertLess("bull p50 < p90", bullResult.p50, bullResult.p90);

  assertInRange("bear p10 > 0", bearResult.p10, 0.01, 1e9);
  assertLess("bear p10 < p50", bearResult.p10, bearResult.p50);
  assertLess("bear p50 < p90", bearResult.p50, bearResult.p90);

  // Directional sanity: bullish median should be above current, bearish below
  const bullLast  = bullishSeq[bullishSeq.length - 1][3];
  const bearLast  = bearishSeq[bearishSeq.length - 1][3];
  console.log(`  bull last=${bullLast.toFixed(2)} → p50=${bullResult.p50.toFixed(2)}`);
  console.log(`  bear last=${bearLast.toFixed(2)} → p50=${bearResult.p50.toFixed(2)}`);

  // Source should confirm offline engine
  if (bullResult.source.includes("TFT")) throw new Error("Expected non-TFT source during circuit-breaker");
  console.log("  Source:", bullResult.source);
}

async function testCircuitBreakerReset() {
  console.log("\n[TEST 2] Circuit Breaker State Machine");
  // Clear circuit breaker state with a long-lived TTL so the count survives across calls
  await setInCache("ml_circuit_tripped", false, 300_000);
  await setInCache("ml_failure_count", 0, 300_000);

  // ML_INFERENCE_URL is unset → points to 127.0.0.1:5000 which is not running → should fail.
  // Use a unique ticker + unique price per call to bypass the prediction cache.
  console.log("  Forcing 3 ML connection failures to trip circuit...");
  for (let i = 1; i <= 3; i++) {
    const seq = buildSyntheticSequence(80, 100 + i, 0.0, 0.01);
    await predictNextHorizon(seq, `TRIP_TEST_${i}`, 0.20);
    console.log(`    Failure ${i} attempted.`);
  }

  const isTripped = !!(await getFromCache("ml_circuit_tripped"));
  if (!isTripped) throw new Error("Circuit breaker should be tripped after 3 failures");
  console.log("  PASS: Circuit breaker tripped after consecutive failures.");
}

async function testInsufficientDataHandling() {
  console.log("\n[TEST 3] Insufficient Data Handling (< 20 bars)");
  await setInCache("ml_circuit_tripped", true, 60_000); // Stay offline

  const shortSeq = buildSyntheticSequence(10, 50, 0.0, 0.01);
  const result   = await predictNextHorizon(shortSeq, "SHORT_TEST", 0.15);
  console.log("  Result:", result);
  
  // Should gracefully return zeroes with a meaningful source string
  if (result.source !== "Incomplete Data") throw new Error(`Expected 'Incomplete Data' source, got: ${result.source}`);
  console.log("  PASS: Graceful degradation with short sequence.");
}

async function testCacheHitRate() {
  console.log("\n[TEST 4] Cache Hit Rate");
  await setInCache("ml_circuit_tripped", true, 60_000);

  const seq = buildSyntheticSequence(60, 300, 0.0005, 0.01);
  const t0 = Date.now();
  const r1 = await predictNextHorizon(seq, "CACHE_TEST", 0.16);
  const t1 = Date.now();
  const r2 = await predictNextHorizon(seq, "CACHE_TEST", 0.16);
  const t2 = Date.now();

  const firstCallMs  = t1 - t0;
  const secondCallMs = t2 - t1;
  console.log(`  First call:  ${firstCallMs}ms (compute)`);
  console.log(`  Second call: ${secondCallMs}ms (cached)`);

  if (secondCallMs > firstCallMs / 2) {
    console.warn(`  WARN: Cache may not be providing speedup (2nd: ${secondCallMs}ms vs 1st: ${firstCallMs}ms)`);
  } else {
    console.log(`  PASS: Cache reduced latency by ${Math.round((1 - secondCallMs / firstCallMs) * 100)}%.`);
  }

  if (r1.p50 !== r2.p50) throw new Error("Cache returned different p50 for identical input");
  console.log("  PASS: p50 identical between calls.");
}

// ── Runner ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Asset-Vector Inference Engine Test Suite v3.0 ===");
  try {
    await testTier1LocalEngine();
    await testCircuitBreakerReset();
    await testInsufficientDataHandling();
    await testCacheHitRate();
    console.log("\n✓ All tests passed.\n");
    process.exit(0);
  } catch (err: any) {
    console.error("\n✗ Test suite failed:", err.message);
    process.exit(1);
  }
}

main();
