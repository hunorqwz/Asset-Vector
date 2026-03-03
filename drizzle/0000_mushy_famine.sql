CREATE TABLE "accounts" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"ticker" varchar(10) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sector" varchar(50),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "market_data" (
	"ticker" varchar(10),
	"time" timestamp NOT NULL,
	"open" numeric(18, 8) NOT NULL,
	"high" numeric(18, 8) NOT NULL,
	"low" numeric(18, 8) NOT NULL,
	"close" numeric(18, 8) NOT NULL,
	"volume" numeric(24, 8) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"price_at_generation" numeric(18, 8),
	"score" numeric(5, 2),
	"signal_label" varchar(20),
	"direction" varchar(20),
	"confidence" numeric(10, 4),
	"snr" numeric(10, 4),
	"regime" varchar(50),
	"is_evaluated" boolean DEFAULT false,
	"outcome_price_7d" numeric(18, 8),
	"accuracy_score" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"target_price" numeric(18, 8) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"note" text,
	"is_triggered" boolean DEFAULT false,
	"triggered_at" timestamp,
	"triggered_price" numeric(18, 8),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"shares" numeric(18, 8) NOT NULL,
	"avg_cost" numeric(18, 8) NOT NULL,
	"notes" text,
	"opened_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_watchlists" (
	"userId" uuid NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "user_watchlists_userId_ticker_pk" PRIMARY KEY("userId","ticker")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"tier" varchar(20) DEFAULT 'free',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_ticker_assets_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."assets"("ticker") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_ticker_assets_ticker_fk" FOREIGN KEY ("ticker") REFERENCES "public"."assets"("ticker") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_market_data_time" ON "market_data" USING btree ("time");--> statement-breakpoint
CREATE INDEX "idx_price_alerts_user_id" ON "price_alerts" USING btree ("userId");