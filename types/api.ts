/**
 * API request/response type definitions
 */

export interface QueryRequest {
  sql: string;
  params?: unknown[];
  page?: number;
  pageSize?: number;
  orderBy?: string;
  where?: string;
}

export interface MutateRequest {
  sql: string;
  params?: unknown[];
}

export interface BulkRequest {
  operations: {
    sql: string;
    params?: unknown[];
  }[];
  transactional: boolean;
  dryRun?: boolean;
}

export interface BackupRequest {
  scope: 'full' | 'tables';
  tables?: string[];
  format: 'jsonl';
  compression: 'gzip';
  batchSize: number;
}

export interface RestoreValidateRequest {
  file: File;
}

export interface RestoreValidateResponse {
  valid: boolean;
  tables: string[];
  estimatedRows: number;
  moduleVersion?: string;
  warnings: string[];
}

export interface RestoreExecuteRequest {
  file: File;
  strategy: 'replace' | 'append';
  tables?: string[];
}

export interface RestoreExecuteResponse {
  success: boolean;
  tablesProcessed: string[];
  rowsInserted: number;
  errors: string[];
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}




