import { Metadata } from "next";
import { getPositions } from "@/app/actions/portfolio";
import { getPortfolioRiskInputPayload } from "@/app/actions/portfolio";
import { PageHeader } from "@/components/organisms/PageHeader";
import { PortfolioStressTest } from "@/components/organisms/PortfolioStressTest";

export const metadata: Metadata = {
  title: "Interactive Portfolio Stress Testing | Asset Vector",
  description: "Simulate interest rate spikes, correlation panics, and macro volatility shifts against your portfolio.",
};

export const dynamic = "force-dynamic";

export default async function StressTestPage() {
  // 1. Fetch user positions
  let positions = await getPositions().catch(() => []);
  let isDemo = false;

  // 2. Hydrate demo portfolio fallback if empty
  if (positions.length === 0) {
    isDemo = true;
    positions = [
      { id: "demo-aapl", ticker: "AAPL", name: "Apple Inc.", shares: 100, avgCost: 180, openedAt: new Date(), notes: "Demo Position" },
      { id: "demo-msft", ticker: "MSFT", name: "Microsoft Corporation", shares: 50, avgCost: 360, openedAt: new Date(), notes: "Demo Position" },
      { id: "demo-tsla", ticker: "TSLA", name: "Tesla, Inc.", shares: 75, avgCost: 160, openedAt: new Date(), notes: "Demo Position" },
      { id: "demo-tlt", ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", shares: 120, avgCost: 100, openedAt: new Date(), notes: "Demo Position" },
    ];
  }

  // 3. Fetch daily history & market pulse
  const riskPayload = await getPortfolioRiskInputPayload(positions).catch(() => ({
    historyData: [],
    pulse: null,
  }));

  return (
    <>
      <PageHeader />

      <PortfolioStressTest
        initialPositions={positions}
        historyData={riskPayload.historyData}
        pulse={riskPayload.pulse}
        isDemoPortfolio={isDemo}
      />
    </>
  );
}
