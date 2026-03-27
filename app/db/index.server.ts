// File: workspace/app/db/index.server.ts (30 lines, 834 bytes)

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// For Remix, we want to make sure the client is only initialized once
let db: ReturnType<typeof createClient>;

function createClient() {
  // Use connection pooling in production
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

// Use a singleton pattern for database connections
declare global {
  var __db__: ReturnType<typeof createClient>;
}

// In production, always create a new client. In development, reuse the client
if (process.env.NODE_ENV === 'production') {
  db = createClient();
} else {
  if (!global.__db__) {
    global.__db__ = createClient();
  }
  db = global.__db__;
}

export { db };
export type Database = ReturnType<typeof createClient>; 
