import 'dotenv/config';
import postgres from 'postgres';

async function wipeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  try {
    console.log('Wiping database...');
    const sql = postgres(connectionString, { max: 1 });

    // Get all table names in the current database
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    // Drop all tables
    for (const table of tables) {
      console.log(`Dropping table: ${table.tablename}`);
      await sql`DROP TABLE IF EXISTS ${sql(table.tablename)} CASCADE`;
    }
    
    console.log(`Dropped ${tables.length} tables`);
    
    console.log('Database wiped successfully');
    await sql.end();
  } catch (error) {
    console.error('Database wipe failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
// @ts-ignore - import.meta.main is a bun-specific API
if (import.meta.main) {
  wipeDatabase().then(() => {
    console.log('Wipe completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Wipe failed:', error);
    process.exit(1);
  });
}

export { wipeDatabase }; 