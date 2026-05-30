import { Metadata } from "next";
import { getAlerts, checkAndTriggerAlerts, getRegimeBreakout } from "@/app/actions/alerts";
import { getPositions } from "@/app/actions/portfolio";
import { getPortfolioPrices } from "@/app/actions";
import { GlobalFooter } from "@/components/organisms/GlobalFooter";
import { SyllabusClient } from "@/components/organisms/SyllabusClient";

export const metadata: Metadata = {
  title: "Quantitative Finance Syllabus & Glossary | Asset Vector",
  description: "A centralized quantitative roadmap and interactive learning center for financial analysis.",
};

export const dynamic = "force-dynamic";

export default async function EducationPage() {
  const [positions, regimeData, alerts] = await Promise.all([
    getPositions().catch(() => []),
    getRegimeBreakout().catch(() => null),
    getAlerts().catch(() => []),
  ]);

  const tickers = [...new Set(positions.map((p) => p.ticker))];
  const priceMap = tickers.length > 0 ? await getPortfolioPrices(tickers).catch(() => ({})) : {};
  const { insights } = await checkAndTriggerAlerts(priceMap).catch(() => ({ insights: [] }));

  return (
    <>
      <SyllabusClient 
        alerts={alerts} 
        insights={insights} 
        regimeBreakout={regimeData} 
      />
      <GlobalFooter />
    </>
  );
}
