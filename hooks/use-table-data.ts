/**
 * React Query hook for fetching table data
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryResult } from '@/types/spacetime';
import type { QueryRequest, MutateRequest } from '@/types/api';

/**
 * Hook to fetch table data with configurable row limit
 * 
 * IMPORTANT: SpacetimeDB SQL doesn't support LIMIT/OFFSET, so this fetches ALL rows.
 * For large tables (>10k rows), this could cause performance issues.
 * 
 * @param tableName - Name of the table to query
 * @param maxRows - Maximum rows to fetch (default: 10000). Set to -1 for unlimited (use with caution!)
 */
export function useTableData(tableName: string, maxRows = 10000) {
  return useQuery<QueryResult & { truncated?: boolean; fetchedRows?: number }>({
    queryKey: ['table-data', tableName, maxRows],
    queryFn: async () => {
      // SpacetimeDB SQL doesn't support LIMIT/OFFSET, so we fetch all rows
      // and truncate client-side if needed
      const sql = `SELECT * FROM ${tableName}`;

      const response = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, maxRows }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch table data');
      }

      const result = await response.json();
      
      return result;
    },
    enabled: !!tableName,
    staleTime: 30000, // Cache for 30 seconds since we're fetching all data
  });
}

export function useQueryData(sql: string, params?: unknown[]) {
  return useQuery<QueryResult>({
    queryKey: ['query', sql, params],
    queryFn: async () => {
      const request: QueryRequest = { sql, params };

      const response = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to execute query');
      }

      return response.json();
    },
    enabled: !!sql,
  });
}

export function useMutateData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MutateRequest) => {
      const response = await fetch('/api/sql/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Mutation failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all table data queries
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
    },
  });
}
