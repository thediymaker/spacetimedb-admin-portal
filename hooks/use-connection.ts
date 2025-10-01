/**
 * React Query hook for connection health check
 */

'use client';

import { useQuery } from '@tanstack/react-query';

interface HealthResponse {
  status: 'connected' | 'error';
  config: {
    uri: string;
    module: string;
    httpApi: string;
  };
  tables?: number;
  error?: string;
  timestamp: string;
}

export function useConnection() {
  return useQuery<HealthResponse>({
    queryKey: ['connection-health'],
    queryFn: async () => {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Connection failed');
      }
      
      return data;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 2,
  });
}




