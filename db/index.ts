import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  // In Dev, we might not have a DB yet. 
  // We throw only if we try to Query.
  // console.warn("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL!);
import * as schema from './schema';
export const db = drizzle(sql, { schema });
