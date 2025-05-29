// src/lib/db-dynamic.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Robust environment variable validation
if (!process.env.DATABASE_URL) {
  const message = 'FATAL ERROR: DATABASE_URL is not defined.';
  console.error(message);
  if (process.env.NODE_ENV === 'production') {
    // In production, it's better to fail fast if critical config is missing
    throw new Error(message);
  }
  // For development, we'll continue but db will be null
  console.warn('Database will be unavailable due to missing DATABASE_URL');
}

let db: ReturnType<typeof drizzle> | null = null;

try {
  if (process.env.DATABASE_URL) {
    // Initialize PostgreSQL client
    const client = postgres(process.env.DATABASE_URL, {
      prepare: false, // Disable prepared statements for compatibility with some hosting providers
      max: 10, // Maximum number of connections in the pool
      idle_timeout: 20, // Close connections after 20 seconds of inactivity
      connect_timeout: 10, // Timeout for establishing connections
    });

    // Initialize Drizzle ORM
    db = drizzle(client);
    console.log('Database connection initialized successfully');
  }
} catch (error) {
  const message = `FATAL ERROR: Failed to initialize database connection: ${error}`;
  console.error(message);
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }
  
  // In development, log the error but don't crash
  console.warn('Database will be unavailable due to connection error');
  db = null;
}

// Validate database connection in production
if (process.env.NODE_ENV === 'production' && !db) {
  throw new Error('FATAL ERROR: Database connection is required in production but could not be established');
}

export { db };

// Export types
export type DbClient = typeof db;

export * from './schema';
export * from './schema';