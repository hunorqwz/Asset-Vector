import { fetchMultiLiveQuotes } from '../lib/market-data';

async function test() {
  const tickers = ["^VIX", "DX-Y.NYB", "^TNX", "SPY", "QQQ", "BTC-USD"];
  console.log("Fetching macro quotes...");
  const quotes = await fetchMultiLiveQuotes(tickers);
  console.log("Results:", JSON.stringify(quotes, null, 2));
}

test().catch(console.error);
