import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

const userId = 'd96cd735-2a74-4c02-b08c-23128382293b';

try {
  const result = await sql`
    DELETE FROM sessions 
    WHERE user_id = ${userId}
    RETURNING id, user_id
  `;
  
  console.log('Deleted sessions:', result);
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
