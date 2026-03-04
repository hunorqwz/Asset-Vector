import 'dotenv/config'; 
import { db } from "../db";
import { users, marketSignals } from "../db/schema";
import { fetchMarketData } from "../lib/market-data";
import { eq } from "drizzle-orm";

async function runDiagnostics() {
  console.log("--- ASSET VECTOR DIAGNOSTICS ---");
  
  // 1. DATABASE CONNECTIVITY
  try {
    console.log("[1/3] Testing Neon DB...");
    const testUserEmail = `test_${Date.now()}@assetvector.ai`;
    
    // Create Test User
    const [newUser] = await db.insert(users).values({
      email: testUserEmail,
      tier: "free"
    }).returning();
    
    console.log("  ✅ User Created:", newUser.id);
    
    // Verify Read
    const fetchedUser = await db.query.users.findFirst({
      where: eq(users.email, testUserEmail)
    });
    
    if (fetchedUser?.email === testUserEmail) {
        console.log("  ✅ Read Verification Passed");
    } else {
        throw new Error("Read verification failed");
    }

  } catch (e) {
    console.error("  ❌ DB FAILURE:", e);
    process.exit(1);
  }

  // 2. MARKET DATA INTELLIGENCE
  try {
    console.log("[2/3] Testing Market Intelligence...");
    const btc = await fetchMarketData("BTC-USD");
    
    console.log(`  ✅ Ticker: ${btc.ticker}`);
    console.log(`  ✅ Price: $${btc.price}`);
    console.log(`  ✅ Regime: [${btc.regime}] (Hurst)`);
    console.log(`  ✅ Sentiment: [${btc.sentiment}] (News)`);
    
    if (btc.history.length === 0) throw new Error("History empty");

  } catch (e) {
    console.error("  ❌ MARKET DATA FAILURE:", e);
  }

  // 3. AI SIGNAL PERSISTENCE
  try {
    console.log("[3/3] Testing Signal Storage...");
    
    // Simulate saving a generated signal
    const [savedSignal] = await db.insert(marketSignals).values({
        ticker: "BTC-USD",
        direction: "BULLISH",
        score: "88.50",
        confidence: "0.88",
        snr: "1.24",
        regime: "MOMENTUM"
    }).returning();
    
    console.log("  ✅ Signal Persisted ID:", savedSignal.id);

  } catch (e) {
    console.error("  ❌ SIGNAL STORAGE FAILURE:", e);
  }
  
  console.log("--- DIAGNOSTICS COMPLETE ---");
  process.exit(0);
}

runDiagnostics();
