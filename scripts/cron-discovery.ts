import { getInstitutionalAlphaPicks } from "../app/actions/discovery";
import { getScreenerCandidates } from "../lib/screener";

async function runDiscoveryJob() {
  console.log("----------------------------------------");
  console.log("🚀 [Background Job] Initializing Asset-Vector Tactical Scout Pipeline...");
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
  console.log("----------------------------------------");

  console.time("Total Engine Duration");

  try {
    console.log("\n[Stage 1] Executing Bulk Screener (Hitting Top 150 Institutional Assets)");
    console.time("Stage 1 Duration");
    const baseline = await getScreenerCandidates();
    console.timeEnd("Stage 1 Duration");
    console.log(`✅ Identified Top ${baseline.length} Baseline Momentum/Value Candidates:`);
    console.log(baseline.join(", "));

    console.log("\n[Stage 2 & 3] Dispatching Surgical AI Inference Pipeline...");
    console.log(`Processing ${baseline.length} assets through GARCH/Kalman/Order Blocks...`);
    
    console.time("Stage 2/3 Duration");
    // This executes the pipeline and automatically updates the Redis/KV cache.
    const picks = await getInstitutionalAlphaPicks();
    console.timeEnd("Stage 2/3 Duration");

    console.log(`\n🏆 Alpha Engine Finished! Selected ${picks.length} Elite Assets.`);
    picks.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.ticker.padEnd(5)} | Score: ${p.score} | Scanner: ${p.scanner.padEnd(15)} | Corr: ${p.correlationToPortfolio ?? 'N/A'}`);
    });

    console.log("\n✅ Cache successfully hydrated. Users will experience 0ms latency.");

  } catch (err) {
    console.error("❌ Critical failure in Discovery Pipeline:", err);
  } finally {
    console.timeEnd("Total Engine Duration");
    process.exit(0);
  }
}

runDiscoveryJob();
