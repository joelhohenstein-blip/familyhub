import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

// For one-off migrations and schema pushes
async function runMigrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // For migrations
  try {
    console.log('Running migrations...');
    const migrationClient = postgres(connectionString, { max: 1 });
    await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
    console.log('Migrations complete');
    
    // Close the connection
    await migrationClient.end();
  } catch (error) {
    console.error('Migration failed', error);
    process.exit(1);
  }
}

// For direct schema pushes in development - now handled by drizzle-kit
async function pushSchema() {
  console.log('Schema push is now handled by drizzle-kit push command');
  console.log('This ensures all schema tables are automatically created from your schema definitions');
  console.log('No manual SQL required - Drizzle handles it all!');
}

// Check which command to run
const command = process.argv[2];
if (command === 'migrate') {
  runMigrate();
} else if (command === 'push') {
  pushSchema();
} else {
  console.log('Usage: ts-node migrate.ts [migrate|push]');
  process.exit(1);
} 