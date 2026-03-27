import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

const passwordHash = '$2b$12$YlUajYJgZ3I8ZjcXUsNaGuuccUMlsgharYwIrxoqIiFddYW2icQvi';
const email = 'bright-falcon@pre.dev';

try {
  const result = await sql`
    UPDATE users 
    SET password_hash = ${passwordHash}
    WHERE email = ${email}
    RETURNING id, email, password_hash
  `;
  
  console.log('Update result:', result);
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
