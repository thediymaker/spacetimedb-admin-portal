/**
 * API Route: Get SpacetimeDB Reducers
 * Fetches the database schema and returns reducer information
 */

import { NextResponse } from 'next/server';
import { SpacetimeHttpClient } from '@/lib/spacetime/http-client';

// Disable static optimization for this route
export const dynamic = 'force-dynamic';

/**
 * Parse algebraic type to human-readable string
 */
function parseAlgebraicType(algebraicType: any): string {
  if (!algebraicType) return 'unknown';

  // Handle simple types
  if (algebraicType.U8 !== undefined) return 'u8';
  if (algebraicType.U16 !== undefined) return 'u16';
  if (algebraicType.U32 !== undefined) return 'u32';
  if (algebraicType.U64 !== undefined) return 'u64';
  if (algebraicType.U128 !== undefined) return 'u128';
  if (algebraicType.I8 !== undefined) return 'i8';
  if (algebraicType.I16 !== undefined) return 'i16';
  if (algebraicType.I32 !== undefined) return 'i32';
  if (algebraicType.I64 !== undefined) return 'i64';
  if (algebraicType.I128 !== undefined) return 'i128';
  if (algebraicType.Bool !== undefined) return 'bool';
  if (algebraicType.F32 !== undefined) return 'f32';
  if (algebraicType.F64 !== undefined) return 'f64';
  if (algebraicType.String !== undefined) return 'string';
  
  // Handle complex types
  if (algebraicType.Ref !== undefined) return `type_${algebraicType.Ref}`;
  if (algebraicType.Array !== undefined) return `array`;
  if (algebraicType.Map !== undefined) return `map`;

  return 'unknown';
}

/**
 * GET /api/reducers
 * Returns list of all reducers in the database
 */
export async function GET() {
  try {
    const client = new SpacetimeHttpClient();
    const schema = await client.getDatabaseSchema();

    // Parse reducers into a simpler format
    const reducers = (schema.reducers || []).map((reducer) => {
      const params = reducer.params.elements.map((param) => ({
        name: param.name && 'some' in param.name ? param.name.some : null,
        type: parseAlgebraicType(param.algebraic_type),
      }));

      const isLifecycle = reducer.lifecycle && 'some' in reducer.lifecycle;
      const lifecycleType = isLifecycle && 'some' in reducer.lifecycle
        ? Object.keys(reducer.lifecycle.some || {})[0]
        : undefined;

      return {
        name: reducer.name,
        params,
        isLifecycle,
        lifecycleType,
      };
    });

    return NextResponse.json({
      reducers,
      cached: false,
    });
  } catch (error) {
    console.error('[Reducers API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch reducers',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

