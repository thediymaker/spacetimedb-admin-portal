/**
 * Schema Discovery Service
 * Discovers tables, columns, types, and constraints from SpacetimeDB
 */

import { config } from '@/lib/config';
import { SpacetimeHttpClient } from './http-client';
import type { TableMetadata, ColumnMetadata } from '@/types/spacetime';
import type { SchemaCache } from '@/types/schema';

export class SchemaDiscovery {
  private client: SpacetimeHttpClient;
  private cache: SchemaCache | null = null;

  constructor(client?: SpacetimeHttpClient) {
    this.client = client || new SpacetimeHttpClient();
  }

  /**
   * Get all tables with caching
   */
  async getAllTables(forceRefresh = false): Promise<TableMetadata[]> {
    // Check cache
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      return this.cache.tables;
    }

    // Discover tables
    const tableNames = await this.client.getTables();
    const tables: TableMetadata[] = [];

    for (const tableName of tableNames) {
      try {
        const table = await this.discoverTable(tableName);
        tables.push(table);
      } catch (error) {
        console.error(`Failed to discover table ${tableName}:`, error);
      }
    }

    // Update cache
    this.cache = {
      tables,
      cached: true,
      cachedAt: new Date(),
      ttl: config.spacetime.cacheTtlMinutes * 60 * 1000,
    };

    return tables;
  }

  /**
   * Get single table metadata
   */
  async getTable(tableName: string, forceRefresh = false): Promise<TableMetadata> {
    // Check cache first
    if (!forceRefresh && this.cache) {
      const cachedTable = this.cache.tables.find((t) => t.name === tableName);
      if (cachedTable && this.isCacheValid()) {
        return cachedTable;
      }
    }

    return this.discoverTable(tableName);
  }

  /**
   * Discover table metadata
   */
  private async discoverTable(tableName: string): Promise<TableMetadata> {
    const [columns, rowCount] = await Promise.all([
      this.discoverColumns(tableName),
      this.client.getTableRowCount(tableName),
    ]);

    return {
      name: tableName,
      schema: 'public',
      columns,
      indexes: [],
      constraints: [],
      estimatedRows: rowCount,
    };
  }

  /**
   * Discover table columns
   */
  private async discoverColumns(tableName: string): Promise<ColumnMetadata[]> {
    const schemaInfo = await this.client.getTableSchema(tableName);

    return schemaInfo.map((col) => ({
      name: col.name,
      dataType: this.normalizeDataType(col.type),
      nullable: col.nullable,
      isPrimary: false, // Will be enhanced later
      isUnique: false,
    }));
  }

  /**
   * Normalize data types to common format
   */
  private normalizeDataType(type: string): string {
    const typeLower = type.toLowerCase();

    // Map SpacetimeDB types to standard SQL types
    const typeMap: Record<string, string> = {
      i8: 'SMALLINT',
      i16: 'SMALLINT',
      i32: 'INTEGER',
      i64: 'BIGINT',
      i128: 'NUMERIC',
      u8: 'SMALLINT',
      u16: 'INTEGER',
      u32: 'BIGINT',
      u64: 'NUMERIC',
      u128: 'NUMERIC',
      f32: 'REAL',
      f64: 'DOUBLE PRECISION',
      bool: 'BOOLEAN',
      string: 'TEXT',
      identity: 'BIGINT',
      address: 'TEXT',
    };

    return typeMap[typeLower] || type.toUpperCase();
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;

    const now = new Date().getTime();
    const cacheAge = now - this.cache.cachedAt.getTime();

    return cacheAge < this.cache.ttl;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { cached: boolean; age?: number; ttl?: number } {
    if (!this.cache) {
      return { cached: false };
    }

    const age = new Date().getTime() - this.cache.cachedAt.getTime();
    return {
      cached: this.isCacheValid(),
      age,
      ttl: this.cache.ttl,
    };
  }
}

// Export singleton instance
export const schemaDiscovery = new SchemaDiscovery();





