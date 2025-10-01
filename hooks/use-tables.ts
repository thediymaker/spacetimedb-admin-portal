/**
 * React Query hook for fetching tables
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SchemaTablesResponse } from '@/types/schema';
import type { TableMetadata } from '@/types/spacetime';

export function useTables() {
  return useQuery<SchemaTablesResponse>({
    queryKey: ['tables'],
    queryFn: async () => {
      const response = await fetch('/api/schema/tables');
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      return response.json();
    },
  });
}

export function useRefreshTables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/schema/tables', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to refresh tables');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useTable(tableName: string) {
  return useQuery<{ table: TableMetadata }>({
    queryKey: ['table', tableName],
    queryFn: async () => {
      const response = await fetch(`/api/schema/table/${tableName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch table: ${tableName}`);
      }
      return response.json();
    },
    enabled: !!tableName,
  });
}




