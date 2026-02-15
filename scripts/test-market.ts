
import { fetchMarketData } from "../lib/market-data";

async function main() {
  console.log("Testing Market Data Fetch...");
  try {
    const btc = await fetchMarketData("BTC-USD");
    console.log("BTC Signal:", {
      price: btc.price,
      smooth: btc.smoothPrice,
      trend: btc.trend,
      snr: btc.snr
    });

    const nvda = await fetchMarketData("NVDA");
    console.log("NVDA Signal:", {
      price: nvda.price,
      smooth: nvda.smoothPrice,
      trend: nvda.trend,
      snr: nvda.snr
    });
  } catch (e) {
    console.error("Test Failed:", e);
  }
}

main();
