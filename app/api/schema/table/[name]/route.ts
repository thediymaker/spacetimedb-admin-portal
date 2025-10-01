/**
 * API Route: Get single table schema
 * GET /api/schema/table/[name]
 */

import { NextResponse } from 'next/server';
import { schemaDiscovery } from '@/lib/spacetime/schema-discovery';
import type { TableSchemaResponse } from '@/types/schema';

interface RouteParams {
  params: Promise<{
    name: string;
  }>;
}

export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const table = await schemaDiscovery.getTable(params.name, forceRefresh);

    const response: TableSchemaResponse = {
      table,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`Failed to get table ${params.name}:`, error);

    return NextResponse.json(
      {
        error: `Failed to retrieve table: ${params.name}`,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}





