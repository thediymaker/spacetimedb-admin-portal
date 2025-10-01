/**
 * React Query hook for fetching reducer metadata from SpacetimeDB
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface ReducerMetadataRow {
  reducer_name: string;
  category: string | null;
  subcategory: string | null;
  required_role: 'any' | 'authenticated' | 'admin' | 'owner' | string | null;
  description: string | null;
  tags: string | null;
  sort_order: number | null;
  is_deprecated: boolean | null;
}

interface ReducerMetadataResult {
  rows: ReducerMetadataRow[];
}

async function fetchReducerMetadata(): Promise<ReducerMetadataResult> {
  const sql = 'select * from reducer_metadata';
  const response = await fetch('/api/sql/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, maxRows: 10000 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch reducer metadata');
  }

  const data = await response.json();
  return { rows: (data.rows || []) as ReducerMetadataRow[] };
}

export function useReducerMetadata() {
  return useQuery<ReducerMetadataResult>({
    queryKey: ['reducer-metadata'],
    queryFn: fetchReducerMetadata,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}







