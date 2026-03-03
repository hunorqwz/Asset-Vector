ALTER TABLE "market_data" ALTER COLUMN "ticker" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_ticker_time_pk" PRIMARY KEY("ticker","time");