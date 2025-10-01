/**
 * API Route: Call a SpacetimeDB Reducer
 * Executes a reducer with the given parameters via HTTP API
 */

import { NextRequest, NextResponse } from 'next/server';

const SPACETIME_HTTP_API = process.env.NEXT_PUBLIC_SPACETIME_HTTP_API!;
const SPACETIME_MODULE = process.env.NEXT_PUBLIC_SPACETIME_MODULE!;
const SPACETIME_AUTH_TOKEN = process.env.SPACETIME_AUTH_TOKEN;

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

    // Build headers with optional auth token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available (required for admin/owner operations)
    if (SPACETIME_AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${SPACETIME_AUTH_TOKEN}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Reducer Call API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        reducer,
        errorText,
        hasAuthToken: !!SPACETIME_AUTH_TOKEN,
      });
      
      // Check for authentication/authorization errors
      if (errorText.includes('Admin') || 
          errorText.includes('admin') || 
          errorText.includes('Owner') || 
          errorText.includes('owner') ||
          errorText.includes('require') ||
          errorText.includes('authorized')) {
        
        if (!SPACETIME_AUTH_TOKEN) {
          return NextResponse.json(
            {
              error: 'Authentication required',
              details: 'This reducer requires authentication. Please set SPACETIME_AUTH_TOKEN environment variable with your SpacetimeDB auth token.',
              needsAuth: true,
            },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          {
            error: 'Permission denied',
            details: errorText,
            needsPermission: true,
          },
          { status: 403 }
        );
      }
      
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




