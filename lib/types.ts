export type OHLCV = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '1d';
export type NarrativeArticle = { 
  title: string; 
  url: string; 
  date: string; // ISO String
  publisher?: string;
};
