import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

async function testMarketSummary() {
  try {
    const summary = await yahooFinance.marketSummary();
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error(err);
  }
}
testMarketSummary();
