import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (typeof window === "undefined" && !process.env.NEXT_RUNTIME && !databaseUrl) {
  // Only use dotenv in Node development scripts, not in Next.js builds/runtime or Edge
  try {
    const { config } = require('dotenv');
    config({ path: '.env.local' });
    config({ path: '.env' });
  } catch (e) {
    // Silence error if optional deps are missing
  }
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl && process.env.NODE_ENV === 'development') {
  console.warn("⚠️ DATABASE_URL is not set. Dashboard will run in Simulation Mode (Market Data only).");
}

export const db = dbUrl 
  ? drizzle(neon(dbUrl), { schema }) 
  : new Proxy({} as any, {
      get(target, prop) {
        return () => { throw new Error(`Database accessed but DATABASE_URL is missing. Attempted to access: ${String(prop)}`); };
      }
    });
