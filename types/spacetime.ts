/**
 * Core SpacetimeDB type definitions
 */

export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: unknown;
  isPrimary: boolean;
  isUnique: boolean;
  comment?: string;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface ConstraintMetadata {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface TableMetadata {
  name: string;
  schema: string;
  comment?: string;
  columns: ColumnMetadata[];
  indexes: IndexMetadata[];
  constraints: ConstraintMetadata[];
  estimatedRows?: number;
}

export interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  pageInfo?: {
    hasNext: boolean;
    hasPrev: boolean;
    total?: number;
  };
}

export interface MutationResult {
  affectedRows: number;
  success: boolean;
  error?: string;
}

export interface BulkOperation {
  sql: string;
  params?: unknown[];
}

export interface BulkOperationResult {
  results: {
    success: boolean;
    affectedRows: number;
    error?: string;
  }[];
  errors?: string[];
  dryRunReport?: {
    totalOperations: number;
    estimatedAffectedRows: number;
    warnings: string[];
  };
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: Date;
  retryCount: number;
}

export interface SubscriptionInfo {
  tableName: string;
  active: boolean;
  rowCount: number;
  lastUpdate?: Date;
  error?: string;
}





