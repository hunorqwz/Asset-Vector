import 'dotenv/config';
import { db } from "../db";
import { assets } from "../db/schema";

async function main() {
  console.log("Seeding Assets...");
  
  const assetList = [
    { ticker: "BTC-USD", name: "Bitcoin", sector: "Crypto" },
    { ticker: "NVDA", name: "NVIDIA Corp", sector: "Technology" },
    { ticker: "SPY", name: "SPDR S&P 500 ETF", sector: "Index" },
    { ticker: "QQQ", name: "Invesco QQQ Trust", sector: "Index" },
    { ticker: "VIX", name: "CBOE Volatility Index", sector: "Index" },
  ];
  
  try {
      await db.insert(assets).values(assetList).onConflictDoNothing();
      console.log("✅ Assets Seeded successfully.");
  } catch (e) {
      console.error("❌ Seeding Failed:", e);
  }
  process.exit(0);
}

main();
