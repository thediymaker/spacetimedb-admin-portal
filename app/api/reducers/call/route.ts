/**
 * API Route: Call a SpacetimeDB Reducer
 * Executes a reducer with the given parameters via HTTP API
 */

import { NextRequest, NextResponse } from 'next/server';

const SPACETIME_HTTP_API = process.env.NEXT_PUBLIC_SPACETIME_HTTP_API!;
const SPACETIME_MODULE = process.env.NEXT_PUBLIC_SPACETIME_MODULE!;

export async function POST(request: NextRequest) {
  try {
    const { reducer, params = [] } = await request.json();

    if (!reducer) {
      return NextResponse.json(
        { error: 'Reducer name is required' },
        { status: 400 }
      );
    }

    // SpacetimeDB HTTP API endpoint for calling reducers
    // POST /database/{database}/call/{reducer_name}
    const url = `${SPACETIME_HTTP_API}/${SPACETIME_MODULE}/call/${reducer}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Reducer Call API] Error response:', errorText);
      return NextResponse.json(
        {
          error: `Failed to call reducer: ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // Parse response (may be empty for some reducers)
    let result;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[Reducer Call API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to call reducer',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}




