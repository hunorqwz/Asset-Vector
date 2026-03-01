import { computePortfolioRisk } from "../lib/portfolio-risk";

async function runTest() {
  console.log("--- RISK ENGINE STRESS TEST ---");
  
  // Scenario: Highly correlated tech portfolio
  const portfolio = [
    { ticker: "AAPL", weight: 0.5 },
    { ticker: "MSFT", weight: 0.5 }
  ];

  console.log("Testing Tech Portfolio (AAPL/MSFT)...");
  const risk = await computePortfolioRisk(portfolio);
  
  console.log("Portfolio Beta:", risk.portfolioBeta);
  console.log("Correlation Alerts Count:", risk.correlationAlerts.length);
  risk.correlationAlerts.forEach(a => console.log("!", a));
  
  console.log("Scenarios:");
  risk.scenarios.forEach(s => {
    console.log(`- ${s.name}: ${s.projectedReturn.toFixed(2)}% (Impact: ${s.impactLevel})`);
  });

  // Verify Beta logic
  if (risk.portfolioBeta > 0.8 && risk.portfolioBeta < 1.5) {
     console.log("✅ Beta calculation within expected real-world bounds for Tech.");
  } else {
     console.log("❌ Beta calculation seems outlier.");
  }

  // Verify Correlation logic
  if (risk.correlationAlerts.length > 0) {
     console.log("✅ Correlation detection working properly.");
  } else {
     console.log("⚠️ No correlation detected between AAPL/MSFT. Unusual but possible depending on 1Y window.");
  }
}

runTest().catch(console.error);
