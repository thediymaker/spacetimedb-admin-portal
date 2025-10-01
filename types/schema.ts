/**
 * Schema-related type definitions
 */

import type { TableMetadata } from './spacetime';

export interface SchemaCache {
  tables: TableMetadata[];
  cached: boolean;
  cachedAt: Date;
  ttl: number;
}

export interface TableSchemaResponse {
  table: TableMetadata;
  zodSchema?: string;
}

export interface SchemaTablesResponse {
  tables: TableMetadata[];
  cached: boolean;
  ttl: number;
}




