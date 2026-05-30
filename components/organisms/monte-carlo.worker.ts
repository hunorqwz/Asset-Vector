import { runMonteCarloSimulation } from "@/lib/monte-carlo";

self.addEventListener("message", (e: MessageEvent) => {
  const { currentPrice, historicalPrices, daysToSimulate, simulations } = e.data;
  try {
    const result = runMonteCarloSimulation({
      currentPrice,
      historicalPrices,
      daysToSimulate,
      simulations,
    });
    self.postMessage({ success: true, result });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
});
