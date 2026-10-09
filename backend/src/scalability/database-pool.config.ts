/**
 * Database Pool Configuration
 * Configuration for PostgreSQL connection pooling
 */

export interface DatabasePoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  pool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  ssl: boolean;
  statementTimeout: number;
}

export const defaultDatabasePoolConfig: DatabasePoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sparkbot_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
  ssl: process.env.NODE_ENV === 'production',
  statementTimeout: 30000,
};
