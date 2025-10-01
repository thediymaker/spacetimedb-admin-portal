/**
 * API Route: Get all tables
 * GET /api/schema/tables
 */

import { NextResponse } from 'next/server';
import { schemaDiscovery } from '@/lib/spacetime/schema-discovery';
import type { SchemaTablesResponse } from '@/types/schema';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const tables = await schemaDiscovery.getAllTables(forceRefresh);
    const cacheStatus = schemaDiscovery.getCacheStatus();

    const response: SchemaTablesResponse = {
      tables,
      cached: cacheStatus.cached,
      ttl: cacheStatus.ttl || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get tables:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve tables',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Force refresh cache
    schemaDiscovery.clearCache();
    const tables = await schemaDiscovery.getAllTables(true);
    const cacheStatus = schemaDiscovery.getCacheStatus();

    const response: SchemaTablesResponse = {
      tables,
      cached: cacheStatus.cached,
      ttl: cacheStatus.ttl || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to refresh tables:', error);

    return NextResponse.json(
      {
        error: 'Failed to refresh tables',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}





