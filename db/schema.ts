import { pgTable, text, timestamp, boolean, uuid, varchar, jsonb, numeric, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  tier: varchar("tier", { length: 20 }).default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  ticker: varchar("ticker", { length: 10 }).primaryKey(),
  name: text("name").notNull(),
  sector: varchar("sector", { length: 50 }),
  isActive: boolean("is_active").default(true),
});

export const marketData = pgTable("market_data", {
  ticker: varchar("ticker", { length: 10 }).references(() => assets.ticker),
  time: timestamp("time").notNull(),
  open: numeric("open", { precision: 18, scale: 8 }).notNull(),
  high: numeric("high", { precision: 18, scale: 8 }).notNull(),
  low: numeric("low", { precision: 18, scale: 8 }).notNull(),
  close: numeric("close", { precision: 18, scale: 8 }).notNull(),
  volume: numeric("volume", { precision: 24, scale: 8 }).notNull(),
}, (table) => {
  return {
    timeIdx: index("idx_market_data_time").on(table.time),
  };
});

export const signals = pgTable("signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).references(() => assets.ticker),
  generatedAt: timestamp("generated_at").defaultNow(),
  direction: varchar("direction", { length: 10 }),
  targetPrice: numeric("target_price", { precision: 18, scale: 8 }),
  horizonDays: numeric("horizon_days"),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  snr: numeric("snr", { precision: 10, scale: 4 }),
  shapFactors: jsonb("shap_factors"),
  regime: varchar("regime", { length: 50 }),
});
