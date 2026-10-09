/**
 * Database Migration Script
 * Handles running migrations for master and tenant databases
 */

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationConfig {
  masterDbUrl: string;
  tenantDbUrl?: string;
  migrationsPath: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor(config: MigrationConfig) {
    this.pool = new Pool({
      connectionString: config.masterDbUrl,
    });
    this.migrationsPath = config.migrationsPath;
  }

  async runMasterMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Get all migration files
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(f => f.endsWith('.sql'))
        .filter(f => f.includes('master') || !f.includes('tenant'))
        .sort();

      // Get executed migrations
      const { rows } = await client.query('SELECT version FROM schema_migrations');
      const executedMigrations = new Set(rows.map((r: any) => r.version));

      // Run pending migrations
      for (const file of migrationFiles) {
        const version = file.split('_')[0];
        
        if (!executedMigrations.has(version)) {
          console.log(`Running migration: ${file}`);
          
          const migrationPath = path.join(this.migrationsPath, file);
          const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
          
          await client.query(migrationSql);
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [version]
          );
          
          console.log(`Migration ${file} completed successfully`);
        }
      }

      await client.query('COMMIT');
      console.log('Master migrations completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error running master migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runTenantMigrations(tenantDbUrl: string): Promise<void> {
    const pool = new Pool({ connectionString: tenantDbUrl });
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Get all tenant migration files
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(f => f.endsWith('.sql'))
        .filter(f => f.includes('tenant'))
        .sort();

      // Get executed migrations
      const { rows } = await client.query('SELECT version FROM schema_migrations');
      const executedMigrations = new Set(rows.map((r: any) => r.version));

      // Run pending migrations
      for (const file of migrationFiles) {
        const version = file.split('_')[0];
        
        if (!executedMigrations.has(version)) {
          console.log(`Running tenant migration: ${file}`);
          
          const migrationPath = path.join(this.migrationsPath, file);
          const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
          
          await client.query(migrationSql);
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [version]
          );
          
          console.log(`Tenant migration ${file} completed successfully`);
        }
      }

      await client.query('COMMIT');
      console.log('Tenant migrations completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error running tenant migrations:', error);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }

  async createTenantDatabase(companyId: string, companyName: string): Promise<string> {
    const client = await this.pool.connect();
    try {
      const dbName = `tenant_${companyId.replace(/-/g, '_')}`;
      
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Created tenant database: ${dbName}`);
      
      // Run tenant migrations
      const tenantDbUrl = `${process.env.DATABASE_URL}/${dbName}`;
      await this.runTenantMigrations(tenantDbUrl);
      
      return dbName;
    } catch (error) {
      console.error('Error creating tenant database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const config = {
    masterDbUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/sparktree_master',
    migrationsPath: path.join(__dirname, '../migrations'),
  };

  const runner = new MigrationRunner(config);

  (async () => {
    try {
      if (command === 'master') {
        await runner.runMasterMigrations();
      } else if (command === 'tenant') {
        const tenantDbUrl = process.argv[3];
        if (!tenantDbUrl) {
          throw new Error('Tenant database URL required');
        }
        await runner.runTenantMigrations(tenantDbUrl);
      } else if (command === 'create-tenant') {
        const companyId = process.argv[3];
        const companyName = process.argv[4];
        if (!companyId || !companyName) {
          throw new Error('Company ID and name required');
        }
        await runner.createTenantDatabase(companyId, companyName);
      } else {
        console.log('Usage:');
        console.log('  npm run db:migrate:master');
        console.log('  npm run db:migrate:tenant <tenant-db-url>');
        console.log('  npm run db:create:tenant <company-id> <company-name>');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await runner.close();
    }
  })();
}
