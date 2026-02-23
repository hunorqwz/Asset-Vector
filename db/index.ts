import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️ DATABASE_URL is not set. Dashboard will run in Simulation Mode (Market Data only).");
}

// Create a dummy client if URL is missing to prevent 'neon()' from crashing immediately
const sql = databaseUrl ? neon(databaseUrl) : (null as any);

export const db = databaseUrl 
  ? drizzle(sql, { schema }) 
  : new Proxy({} as any, {
      get(target, prop) {
        return () => { throw new Error(`Database accessed but DATABASE_URL is missing. Attempted to access: ${String(prop)}`); };
      }
    });
