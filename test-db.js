import pg from 'pg';
const { Client } = pg;
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Loads variables from the src/.env file
dotenv.config({ path: path.join(__dirname, 'src', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // Supabase cloud databases require SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('✅ Connection successful!');
    
    const res = await client.query('SELECT NOW() as now');
    console.log('Database Server Time:', res.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();