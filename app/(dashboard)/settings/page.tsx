import { Metadata } from "next";
import { auth } from "@/auth";
import { getAlerts } from "@/app/actions/alerts";
import { db } from "@/db";
import { users, userWatchlists, userPositions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/organisms/PageHeader";
import { SettingsContainer } from "@/components/organisms/SettingsContainer";

export const metadata: Metadata = {
  title: "Settings & System Controls | Asset Vector",
  description: "Configure default settings, execution preferences, and active alerts.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!userRecord) {
    redirect("/login");
  }

  const alerts = await getAlerts();

  const watchlistItems = await db.query.userWatchlists.findMany({
    where: eq(userWatchlists.userId, session.user.id),
    columns: { ticker: true }
  });

  const positionItems = await db.query.userPositions.findMany({
    where: eq(userPositions.userId, session.user.id),
    columns: { ticker: true }
  });

  const allTickers = Array.from(new Set([
    ...watchlistItems.map((w: any) => w.ticker),
    ...positionItems.map((p: any) => p.ticker)
  ]));

  return (
    <>
      <PageHeader />
      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#f8fafc]">
        <div className="max-w-[1200px] mx-auto space-y-8">
          
          {/* TOP PAGE HEADER CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Platform Configuration</span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                  Settings Active
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Platform Settings & Alert Rules</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Manage user profile, broker credentials, alert thresholds, and system preferences.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <SettingsContainer 
              user={{ id: userRecord.id, name: userRecord.name, email: userRecord.email, tier: userRecord.tier || 'free' }} 
              initialAlerts={alerts} 
              watchlistTickers={allTickers}
            />
          </div>
        </div>
      </main>
    </>
  );
}
