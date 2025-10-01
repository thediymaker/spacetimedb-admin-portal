/**
 * SpacetimeDB HTTP API Client
 * Handles server-side operations: schema discovery, queries, mutations
 */

import { config } from '@/lib/config';
import type { QueryResult, MutationResult } from '@/types/spacetime';

interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export class SpacetimeHttpClient {
  private baseUrl: string;
  private moduleName: string;

  constructor(baseUrl?: string, moduleName?: string) {
    this.baseUrl = baseUrl || config.spacetime.httpApi;
    this.moduleName = moduleName || config.spacetime.module;
  }

  private async request<T>(
    endpoint: string,
    options: HttpRequestOptions
  ): Promise<T> {
    // SpacetimeDB HTTP API format: https://host/v1/database/{database_name}/{endpoint}
    // baseUrl should be: https://host/v1/database
    const url = `${this.baseUrl}/${this.moduleName}/${endpoint}`;

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HTTP Client] ${options.method} ${endpoint} failed:`, response.status, errorText);
      throw new Error(
        `SpacetimeDB HTTP request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Get database schema
   * Uses SpacetimeDB's schema endpoint: GET /database/{name}/schema
   */
  async getDatabaseSchema(): Promise<{
    tables: Array<{
      name: string;
      product_type_ref: number;
      primary_key: number[];
      indexes: any[];
      constraints: any[];
      sequences: any[];
    }>;
    reducers: Array<{
      name: string;
      params: {
        elements: Array<{
          name: { some: string } | { none: [] };
          algebraic_type: any;
        }>;
      };
      lifecycle: { some: any } | { none: [] };
    }>;
    typespace: {
      types: any[];
    };
  }> {
    // Try different approaches to get schema
    const attempts = [
      // Try with configured version
      config.spacetime.moduleVersion ? `schema?version=${config.spacetime.moduleVersion}` : null,
      // Try common version values
      'schema?version=published',
      'schema?version=latest',
      'schema?version=9',
      'schema?version=current',
    ].filter(Boolean) as string[];

    let lastError: Error | null = null;

    for (const endpoint of attempts) {
      try {
        return await this.request<any>(endpoint, {
          method: 'GET',
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    console.error('[HTTP Client] Failed to get database schema after all attempts');
    throw lastError || new Error('All schema endpoint attempts failed');
  }


  /**
   * Execute a SQL mutation (INSERT, UPDATE, DELETE)
   * Uses the SpacetimeDB SQL endpoint: POST /database/{identity}/sql
   */
  async mutate(sql: string, params?: unknown[]): Promise<MutationResult> {
    try {
      const url = `${this.baseUrl}/${this.moduleName}/sql`;
      
      // Get auth token from environment
      const authToken = process.env.SPACETIME_AUTH_TOKEN;
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: sql, // Send raw SQL, not JSON
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[HTTP Client] Mutation failed:', response.status, errorText);
        
        return {
          success: false,
          affectedRows: 0,
          error: `SpacetimeDB error: ${response.statusText} - ${errorText}`,
        };
      }

      // SpacetimeDB SQL endpoint returns SATS-JSON result
      await response.json();

      return {
        success: true,
        affectedRows: 0, // SpacetimeDB doesn't return affected rows count
      };
    } catch (error) {
      console.error('[HTTP Client] Mutation exception:', error);
      return {
        success: false,
        affectedRows: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get list of all tables from database schema
   */
  async getTables(): Promise<string[]> {
    try {
      const schema = await this.getDatabaseSchema();
      return schema.tables.map((table) => table.name);
    } catch (error) {
      console.error('[HTTP Client] Failed to get tables:', error);
      return [];
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<{
    name: string;
    type: string;
    nullable: boolean;
  }[]> {
    try {
      const schema = await this.getDatabaseSchema();
      const table = schema.tables.find((t) => t.name === tableName);
      
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      // Get the product type for this table
      const productType = schema.typespace.types[table.product_type_ref];
      
      if (!productType || !productType.Product || !productType.Product.elements) {
        throw new Error(`Could not find product type for table ${tableName}`);
      }

      return productType.Product.elements.map((col: any) => ({
        name: col.name?.some || 'unknown',
        type: this.formatAlgebraicType(col.algebraic_type),
        nullable: true, // TODO: Parse algebraic_type for Option<T>
      }));
    } catch (error) {
      console.error(`[HTTP Client] Failed to get schema for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Format SpacetimeDB algebraic type to readable string
   */
  private formatAlgebraicType(algType: any): string {
    if (!algType) return 'unknown';
    
    // Handle primitive types directly in the object
    if (algType.U8 !== undefined) return 'u8';
    if (algType.U16 !== undefined) return 'u16';
    if (algType.U32 !== undefined) return 'u32';
    if (algType.U64 !== undefined) return 'u64';
    if (algType.U128 !== undefined) return 'u128';
    if (algType.I8 !== undefined) return 'i8';
    if (algType.I16 !== undefined) return 'i16';
    if (algType.I32 !== undefined) return 'i32';
    if (algType.I64 !== undefined) return 'i64';
    if (algType.I128 !== undefined) return 'i128';
    if (algType.F32 !== undefined) return 'f32';
    if (algType.F64 !== undefined) return 'f64';
    if (algType.Bool !== undefined) return 'bool';
    if (algType.String !== undefined) return 'string';
    if (algType.U256 !== undefined) return 'u256';
    
    // Handle Product types (structs/tuples) - common for timestamps
    if (algType.Product && algType.Product.elements) {
      const elements = algType.Product.elements;
      
      // Check for SpacetimeDB built-in types
      if (elements.length === 1) {
        const elem = elements[0];
        if (elem.name?.some === '__timestamp_micros_since_unix_epoch__') {
          return 'Timestamp';
        }
        if (elem.name?.some === '__identity__') {
          return 'Identity';
        }
        if (elem.name?.some === '__time_duration_micros__') {
          return 'Duration';
        }
      }
      
      return 'struct';
    }
    
    // Handle Sum types (enums)
    if (algType.Sum) {
      return 'enum';
    }
    
    // Handle Ref types (references to other types)
    if (algType.Ref !== undefined) {
      return `ref(${algType.Ref})`;
    }
    
    // Fallback
    return 'complex';
  }

  /**
   * Get table row count
   * Note: This would require a SELECT COUNT(*) query which needs the /sql endpoint
   * For now, return 0 as row count isn't critical for schema discovery
   */
  async getTableRowCount(tableName: string): Promise<number> {
    // TODO: Implement using /sql endpoint if row counts are needed
    // For now, return 0 since row count isn't used in the UI
    return 0;
  }
}

// Export singleton instance for server-side use
export const httpClient = new SpacetimeHttpClient();
