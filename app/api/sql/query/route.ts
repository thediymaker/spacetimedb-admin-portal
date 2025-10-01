/**
 * API Route: Execute SQL queries against SpacetimeDB via HTTP API
 * Uses POST /v1/database/:name_or_identity/sql endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

const SPACETIME_HTTP_API = process.env.NEXT_PUBLIC_SPACETIME_HTTP_API!;
const SPACETIME_MODULE = process.env.NEXT_PUBLIC_SPACETIME_MODULE!;
const SPACETIME_AUTH_TOKEN = process.env.SPACETIME_AUTH_TOKEN; // Owner auth token for DML operations

export async function POST(request: NextRequest) {
  try {
    const { sql, maxRows = 10000 } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    // Detect query type
    const sqlLower = sql.trim().toLowerCase();
    const isDeleteQuery = sqlLower.startsWith('delete');
    const isSelectQuery = sqlLower.startsWith('select');

    // Call SpacetimeDB HTTP SQL endpoint
    const url = `${SPACETIME_HTTP_API}/${SPACETIME_MODULE}/sql`;
    
    // Build headers with optional auth token
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };
    
    // Add auth token if available (required for DML operations like DELETE)
    if (SPACETIME_AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${SPACETIME_AUTH_TOKEN}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: sql,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SQL API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        url,
        sql: sql.substring(0, 100),
        errorText,
        hasAuthToken: !!SPACETIME_AUTH_TOKEN,
      });
      
      // Check for authorization errors on DML operations
      if ((isDeleteQuery || sqlLower.startsWith('insert') || sqlLower.startsWith('update')) && 
          (errorText.includes('Only owners are authorized') || errorText.includes('not authorized'))) {
        
        if (!SPACETIME_AUTH_TOKEN) {
          return NextResponse.json(
            { 
              error: 'Authentication required', 
              details: 'DELETE/INSERT/UPDATE operations require owner authentication. Please set SPACETIME_AUTH_TOKEN environment variable with your SpacetimeDB owner token.',
              needsAuth: true
            },
            { status: 401 }
          );
        }
      }
      
      // Check if DELETE is not supported
      if (isDeleteQuery && errorText.includes('not supported')) {
        return NextResponse.json(
          { 
            error: 'DELETE not supported', 
            details: 'SpacetimeDB does not support DELETE via SQL. Use reducers for delete operations instead.',
            needsReducer: true
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `SpacetimeDB error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Parse SATS-JSON response
    const results = await response.json();

    // Handle DELETE queries (they return differently)
    if (isDeleteQuery) {
      return NextResponse.json({
        success: true,
        message: 'Delete operation completed',
        result: results,
      });
    }

    // SpacetimeDB returns an array of statement results
    // Each result has: { schema: ProductType, rows: ProductValue[] }
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({
        columns: [],
        rows: [],
        totalRows: 0,
        fetchedRows: 0,
        truncated: false,
      });
    }

    const firstResult = results[0];
    
    // Convert SATS-JSON schema to column definitions
    const columns = parseSchemaToColumns(firstResult.schema);
    
    // Convert SATS-JSON rows to plain objects
    const allRows = firstResult.rows.map((row: any) => parseRowToObject(row, columns));
    
    // Apply row limit if specified (maxRows = -1 means unlimited)
    const totalRows = allRows.length;
    const truncated = maxRows > 0 && totalRows > maxRows;
    const rows = maxRows > 0 ? allRows.slice(0, maxRows) : allRows;

    return NextResponse.json({
      columns,
      rows,
      totalRows,
      fetchedRows: rows.length,
      truncated,
    });

  } catch (error) {
    console.error('[SQL API] Failed to execute query:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute SQL query',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Parse SATS-JSON ProductType schema to column definitions
 */
function parseSchemaToColumns(schema: any): Array<{ name: string; type: string }> {
  if (!schema || !schema.elements) {
    return [];
  }

  return schema.elements.map((element: any, index: number) => {
    // Column names come as {some: "name"} or {none: null}
    let columnName = `col_${index}`;
    if (element.name && element.name.some) {
      columnName = element.name.some;
    }

    return {
      name: columnName,
      type: formatAlgebraicType(element.algebraic_type),
    };
  });
}

/**
 * Parse SATS-JSON ProductValue row to plain object
 * Note: Rows are returned as arrays of values, not ProductValue objects
 */
function parseRowToObject(row: any, columns: Array<{ name: string; type: string }>): Record<string, any> {
  const obj: Record<string, any> = {};
  
  if (!Array.isArray(row)) {
    return obj;
  }

  row.forEach((value: any, index: number) => {
    const column = columns[index];
    if (column) {
      obj[column.name] = parseSatsJsonValue(value);
    }
  });

  return obj;
}

/**
 * Parse SATS-JSON value to JavaScript value
 * 
 * SpacetimeDB returns values in different formats:
 * - Primitives: raw values (numbers, strings, booleans)
 * - Complex types: single-element arrays (e.g., [timestamp], [identity])
 * - Arrays: arrays of values
 */
function parseSatsJsonValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle primitive types
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    // If it's a single-element array with a primitive, unwrap it
    // This handles Identity, Timestamp, etc.
    if (value.length === 1) {
      const element = value[0];
      if (typeof element === 'string' || typeof element === 'number' || typeof element === 'boolean') {
        return element;
      }
    }
    // Otherwise, recursively parse each element
    return value.map(parseSatsJsonValue);
  }

  // Handle objects (shouldn't happen in the new format, but keep for safety)
  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = parseSatsJsonValue(val);
    }
    return result;
  }

  return value;
}

/**
 * Format algebraic type to readable string
 */
function formatAlgebraicType(algType: any): string {
  if (!algType) return 'unknown';
  
  // Handle primitive types
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
  
  // Handle Product types (structs)
  if (algType.Product) {
    return 'struct';
  }
  
  // Handle Sum types (enums)
  if (algType.Sum) {
    return 'enum';
  }
  
  return 'complex';
}