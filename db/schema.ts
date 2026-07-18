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
  benchmarkPriceAtGeneration: numeric("benchmark_price_at_generation", { precision: 18, scale: 8 }),
  benchmarkOutcomePrice: numeric("benchmark_outcome_price", { precision: 18, scale: 8 }),
  betaAtGeneration: numeric("beta_at_generation", { precision: 10, scale: 4 }),
  alphaPerformance: numeric("alpha_performance", { precision: 10, scale: 4 }),
  accuracy: numeric("accuracy_score", { precision: 5, scale: 2 }), // 1.0 = Correct (Beat Market), 0.0 = Incorrect
  fullData: jsonb("full_data"), // Stores the complete serialized MarketSignal
}, (table) => {
  return {
    tickerIdx: index("idx_signals_ticker").on(table.ticker),
    labelIdx: index("idx_signals_label").on(table.signalLabel),
    evalIdx: index("idx_signals_eval").on(table.isEvaluated),
    genAtIdx: index("idx_signals_gen_at").on(table.generatedAt),
  };
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

export const latestSignals = pgTable("latest_signals", {
  ticker: varchar("ticker", { length: 10 }).primaryKey(),
  generatedAt: timestamp("generated_at").defaultNow(),
  fullData: jsonb("full_data"), 
});

export const systemKv = pgTable("system_kv", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: jsonb("value").notNull(),
  expiresAt: timestamp("expires_at").notNull()
});

export const futuresCandles = pgTable("futures_candles", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: numeric("open", { precision: 18, scale: 8 }).notNull(),
  high: numeric("high", { precision: 18, scale: 8 }).notNull(),
  low: numeric("low", { precision: 18, scale: 8 }).notNull(),
  close: numeric("close", { precision: 18, scale: 8 }).notNull(),
  volume: numeric("volume", { precision: 18, scale: 8 }).notNull(),
  cvd: numeric("cvd", { precision: 18, scale: 8 }).notNull(),
  poc: numeric("poc", { precision: 18, scale: 8 }).notNull(),
  vah: numeric("vah", { precision: 18, scale: 8 }).notNull(),
  val: numeric("val", { precision: 18, scale: 8 }).notNull(),
  imbalance: numeric("imbalance", { precision: 10, scale: 4 }).notNull(),
}, (table) => {
  return {
    tickerTimeIdx: index("idx_futures_candles_ticker_time").on(table.ticker, table.timestamp),
  };
});

export const futuresAlerts = pgTable("futures_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  cvd: numeric("cvd", { precision: 18, scale: 8 }),
  imbalance: numeric("imbalance", { precision: 10, scale: 4 }),
  isRead: boolean("is_read").default(false).notNull(),
}, (table) => {
  return {
    tickerGenIdx: index("idx_futures_alerts_ticker").on(table.ticker),
  };
});

export const futuresPositions = pgTable("futures_positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // "BUY" | "SELL"
  size: numeric("size", { precision: 18, scale: 8 }).notNull(),
  entryPrice: numeric("entry_price", { precision: 18, scale: 8 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 18, scale: 8 }),
  takeProfit: numeric("take_profit", { precision: 18, scale: 8 }),
  status: varchar("status", { length: 20 }).default("OPEN").notNull(), // "OPEN" | "CLOSED"
  exitPrice: numeric("exit_price", { precision: 18, scale: 8 }),
  pnl: numeric("pnl", { precision: 18, scale: 8 }),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
}, (table) => {
  return {
    userPosIdx: index("idx_futures_pos_user").on(table.userId),
  };
});

