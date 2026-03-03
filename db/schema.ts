import { pgTable, text, timestamp, boolean, uuid, varchar, jsonb, numeric, index, integer, primaryKey } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // Added for credentials-based login
  tier: varchar("tier", { length: 20 }).default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const assets = pgTable("assets", {
  ticker: varchar("ticker", { length: 10 }).primaryKey(),
  name: text("name").notNull(),
  sector: varchar("sector", { length: 50 }),
  isActive: boolean("is_active").default(true),
});

export const userWatchlists = pgTable(
  "user_watchlists",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticker: varchar("ticker", { length: 10 })
      .notNull()
      .references(() => assets.ticker, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.userId, table.ticker] }),
  })
);

export const marketData = pgTable("market_data", {
  ticker: varchar("ticker", { length: 10 }).notNull().references(() => assets.ticker),
  time: timestamp("time").notNull(),
  open: numeric("open", { precision: 18, scale: 8 }).notNull(),
  high: numeric("high", { precision: 18, scale: 8 }).notNull(),
  low: numeric("low", { precision: 18, scale: 8 }).notNull(),
  close: numeric("close", { precision: 18, scale: 8 }).notNull(),
  volume: numeric("volume", { precision: 24, scale: 8 }).notNull(),
}, (table) => {
  return {
    tickerTimePk: primaryKey({ columns: [table.ticker, table.time] }),
    tickerIdx: index("idx_market_data_ticker").on(table.ticker),
    timeIdx: index("idx_market_data_time").on(table.time),
  };
});

export const marketSignals = pgTable("market_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  priceAtGeneration: numeric("price_at_generation", { precision: 18, scale: 8 }),
  score: numeric("score", { precision: 5, scale: 2 }),
  signalLabel: varchar("signal_label", { length: 20 }), // e.g. "STRONG BUY", "NEUTRAL"
  direction: varchar("direction", { length: 20 }), // e.g. "UNCORRELATED"
  confidence: numeric("confidence", { precision: 10, scale: 4 }), // Predictability units
  snr: numeric("snr", { precision: 10, scale: 4 }),
  regime: varchar("regime", { length: 50 }),
  // Fields for later evaluation
  isEvaluated: boolean("is_evaluated").default(false),
  outcomePrice7D: numeric("outcome_price_7d", { precision: 18, scale: 8 }),
  accuracy: numeric("accuracy_score", { precision: 5, scale: 2 }), // 1.0 = Correct, 0.0 = Incorrect
});

export const userPositions = pgTable("user_positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 10 }).notNull().references(() => assets.ticker),
  name: text("name").notNull(),
  shares: numeric("shares", { precision: 18, scale: 8 }).notNull(),
  avgCost: numeric("avg_cost", { precision: 18, scale: 8 }).notNull(),
  notes: text("notes"),
  openedAt: timestamp("opened_at").defaultNow(),
});

export const priceAlerts = pgTable("price_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 10 }).notNull().references(() => assets.ticker),
  targetPrice: numeric("target_price", { precision: 18, scale: 8 }).notNull(),
  // 'above' = alert when price crosses above target, 'below' = alert when price crosses below
  direction: varchar("direction", { length: 10 }).notNull().$type<"above" | "below">(),
  note: text("note"),
  isTriggered: boolean("is_triggered").default(false),
  triggeredAt: timestamp("triggered_at"),
  triggeredPrice: numeric("triggered_price", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("idx_price_alerts_user_id").on(table.userId),
  };
});
