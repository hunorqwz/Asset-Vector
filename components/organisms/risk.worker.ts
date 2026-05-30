import { calculatePortfolioRiskSync } from "@/lib/portfolio-risk-calc";

self.addEventListener("message", (e: MessageEvent) => {
  const { positions, historyData, pulse } = e.data;
  try {
    const result = calculatePortfolioRiskSync(positions, historyData, pulse);
    self.postMessage({ success: true, result });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
});
