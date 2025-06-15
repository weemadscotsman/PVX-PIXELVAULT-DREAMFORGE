import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Corrected schema import
import { WebSocket } from 'ws';

// Configure neon to use websockets for serverless mode
import { neonConfig, Pool } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = WebSocket;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable not set');
}

// Create postgres client
const queryClient = postgres(process.env.DATABASE_URL);

// Create drizzle ORM instance
export const db = drizzle(queryClient, { schema });

// Export pool for connection management
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Export direct query client for raw SQL
export { queryClient };

// Function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Function to close database connections
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    await queryClient.end();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}