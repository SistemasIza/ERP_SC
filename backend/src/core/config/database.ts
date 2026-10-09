// Database connection optimization and pooling
import { Pool, PoolConfig } from 'pg';
import { supabase } from './supabase';
import { logger } from '../logger';

// PostgreSQL connection pool configuration
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sparkbot',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool size
  min: parseInt(process.env.DB_POOL_MIN || '5'), // Minimum pool size
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  logger.info('New database client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

pool.on('remove', () => {
  logger.warn('Database client removed from pool');
});

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
};

// Get pool statistics
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

// Execute query with automatic connection management
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${duration}ms`, { query: text.substring(0, 100) });
    }
    
    return result;
  } catch (error) {
    logger.error('Query execution failed', { query: text, params, error });
    throw error;
  }
};

// Transaction helper
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Batch query execution
export const batchQuery = async (queries: Array<{ text: string; params?: any[] }>) => {
  const results = await Promise.all(
    queries.map(q => query(q.text, q.params))
  );
  return results;
};

// Connection pool management
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('Database connection pool closed');
};

// Initialize connection pool
export const initializePool = async (): Promise<void> => {
  try {
    // Test connection
    await checkDatabaseHealth();
    logger.info('Database connection pool initialized successfully', {
      max: poolConfig.max,
      min: poolConfig.min
    });
  } catch (error) {
    logger.error('Failed to initialize database connection pool', error);
    throw error;
  }
};

// Supabase query wrapper with caching
export const cachedQuery = async (
  tableName: string,
  options: {
    select?: string;
    filter?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    cacheKey?: string;
    cacheTTL?: number;
  } = {}
) => {
  const { cacheKey, cacheTTL = 300 } = options;
  
  // Check cache if key provided
  if (cacheKey) {
    const { cacheService } = await import('../../shared/services/cacheService');
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;
  }

  // Execute query
  let query = supabase.from(tableName).select(options.select || '*');

  if (options.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      query = query.eq(key, value);
    }
  }

  if (options.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Cache result if key provided
  if (cacheKey && data) {
    const { cacheService } = await import('../../shared/services/cacheService');
    cacheService.set(cacheKey, data, cacheTTL);
  }

  return data;
};

// Database backup helper
export const backupDatabase = async (): Promise<void> => {
  try {
    const { exec } = require('child_process');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/backup-${timestamp}.sql`;
    
    await new Promise((resolve, reject) => {
      exec(`pg_dump ${poolConfig.database} > ${backupPath}`, (error: any) => {
        if (error) reject(error);
        else resolve(null);
      });
    });

    logger.info('Database backup completed', { path: backupPath });
  } catch (error) {
    logger.error('Database backup failed', error);
    throw error;
  }
};

// Database migration helper
export const runMigration = async (migrationSql: string): Promise<void> => {
  try {
    await query(migrationSql);
    logger.info('Migration executed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  }
};

export default {
  pool,
  query,
  transaction,
  batchQuery,
  cachedQuery,
  checkDatabaseHealth,
  getPoolStats,
  initializePool,
  closePool,
  backupDatabase,
  runMigration
};
