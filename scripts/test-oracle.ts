import { generateStrategicAnalysis } from "../app/actions/ai";
import { fetchMarketData } from "../lib/market-data";
import { fetchStockDetails } from "../lib/stock-details";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testOracle() {
  console.log("Fetching data for NVDA...");
  try {
    const [signal, details] = await Promise.all([
      fetchMarketData("NVDA", 100),
      fetchStockDetails("NVDA")
    ]);
    
    console.log("Data fetched. Calling generateStrategicAnalysis...");
    const insight = await generateStrategicAnalysis("NVDA", signal.history, details.news);
    console.log("Insight result:", insight);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testOracle();
