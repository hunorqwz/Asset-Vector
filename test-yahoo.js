const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  const ticker = 'AAPL';
  const lookbackSeconds = 0;
  const start = lookbackSeconds === 0 ? 0 : Math.floor(Date.now() / 1000) - lookbackSeconds;
  
  const result = await yahooFinance.chart(ticker, { period1: start, interval: '1d' });
  console.log(`period1: ${start}`);
  console.log(`Number of quotes returned: ${result.quotes.length}`);
  if (result.quotes.length > 0) {
    console.log(`First item date: ${result.quotes[0].date}`);
    console.log(`Last item date: ${result.quotes[result.quotes.length - 1].date}`);
  }
}

test();
