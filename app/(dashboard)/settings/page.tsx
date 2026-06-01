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
  title: "Settings & Alerts Management | Asset Vector",
  description: "Configure default settings, default layouts, and manage active price alerts.",
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
      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-[1000px] mx-auto">
          <div className="mb-12 border-b border-white/5 pb-10">
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tightest leading-[1]">Settings</h1>
          </div>
          <SettingsContainer 
            user={{ id: userRecord.id, name: userRecord.name, email: userRecord.email, tier: userRecord.tier || 'free' }} 
            initialAlerts={alerts} 
            watchlistTickers={allTickers}
          />
        </div>
      </main>
    </>
  );
}

