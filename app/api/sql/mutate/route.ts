/**
 * API Route: Execute SQL mutation
 * POST /api/sql/mutate
 */

import { NextResponse } from 'next/server';
import { httpClient } from '@/lib/spacetime/http-client';
import type { MutateRequest } from '@/types/api';

export async function POST(request: Request) {
  try {
    const body: MutateRequest = await request.json();
    const { sql, params } = body;

    // Validate SQL
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        { error: 'Invalid SQL statement' },
        { status: 400 }
      );
    }

    // Safety check: ensure it's a mutation operation
    const sqlLower = sql.trim().toLowerCase();
    const isMutation =
      sqlLower.startsWith('insert') ||
      sqlLower.startsWith('update') ||
      sqlLower.startsWith('delete');

    if (!isMutation) {
      return NextResponse.json(
        { error: 'Only INSERT, UPDATE, DELETE statements are allowed' },
        { status: 400 }
      );
    }

    // Execute mutation
    const result = await httpClient.mutate(sql, params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mutation failed:', error);

    return NextResponse.json(
      {
        error: 'Mutation execution failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}




