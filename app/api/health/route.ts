/**
 * API Route: Health check and connection test
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import { httpClient } from '@/lib/spacetime/http-client';
import { config } from '@/lib/config';

export async function GET() {
  try {
    // Test connection by attempting to query tables
    const tables = await httpClient.getTables();

    return NextResponse.json({
      status: 'connected',
      config: {
        uri: config.spacetime.uri,
        module: config.spacetime.module,
        httpApi: config.spacetime.httpApi,
      },
      tables: tables.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
        config: {
          uri: config.spacetime.uri || 'NOT SET',
          module: config.spacetime.module || 'NOT SET',
          httpApi: config.spacetime.httpApi || 'NOT SET',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}





