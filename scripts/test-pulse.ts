import { getMarketPulse } from './app/actions';

async function test() {
  console.log("Testing Market Pulse Action...");
  const data = await getMarketPulse();
  console.log("Macro Data:", JSON.stringify(data.macro, null, 2));
}

test().catch(console.error);
