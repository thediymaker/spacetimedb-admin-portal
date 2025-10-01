/**
 * React Query hook for fetching SpacetimeDB reducers
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ReducerParam {
  name: string | null;
  type: string;
}

export interface Reducer {
  name: string;
  params: ReducerParam[];
  isLifecycle: boolean;
  lifecycleType?: string;
}

export interface ReducersData {
  reducers: Reducer[];
  cached: boolean;
}

/**
 * Fetch reducers via API route
 */
async function fetchReducers(): Promise<ReducersData> {
  const response = await fetch('/api/reducers');

  if (!response.ok) {
    throw new Error(`Failed to fetch reducers: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch reducers using React Query
 */
export function useReducers() {
  return useQuery({
    queryKey: ['reducers'],
    queryFn: fetchReducers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to manually refresh reducers
 */
export function useRefreshReducers() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['reducers'] });
    return queryClient.refetchQueries({ queryKey: ['reducers'] });
  };
}




