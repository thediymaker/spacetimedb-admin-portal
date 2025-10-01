/**
 * API Route: Get SpacetimeDB Server Logs
 * Fetches recent logs from the database
 */

import { NextRequest, NextResponse } from 'next/server';

const SPACETIME_HTTP_API = process.env.NEXT_PUBLIC_SPACETIME_HTTP_API!;
const SPACETIME_MODULE = process.env.NEXT_PUBLIC_SPACETIME_MODULE!;
const SPACETIME_AUTH_TOKEN = process.env.SPACETIME_AUTH_TOKEN; // Optional auth token

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const numLines = searchParams.get('num_lines') || '200';

    const url = `${SPACETIME_HTTP_API}/${SPACETIME_MODULE}/logs?num_lines=${numLines}`;

    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'text/plain',
    };

    // Add authorization if token is available
    if (SPACETIME_AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${SPACETIME_AUTH_TOKEN}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Logs API] Error response:', errorText);
      return NextResponse.json(
        {
          error: `Failed to fetch logs: ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const logsText = await response.text();
    
    // Parse logs - SpacetimeDB returns JSON format logs
    // Example: {"level":"Info","ts":1759190958813155,"target":"spacetime_module","filename":"src\\lib.rs","line_number":121,"message":"🔗 Client connected"}
    const logLines = logsText.split('\n').filter(line => line.trim());
    
    const logs = logLines.map((line) => {
      try {
        const logData = JSON.parse(line);
        
        // Convert timestamp from microseconds to ISO string
        const timestamp = new Date(logData.ts / 1000).toISOString().substring(0, 19);
        
        // Normalize log level
        const levelMap: Record<string, 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'> = {
          'Info': 'INFO',
          'Warn': 'WARN',
          'Error': 'ERROR',
          'Debug': 'DEBUG',
        };
        const level = levelMap[logData.level] || 'INFO';
        
        // Build source from filename and line number
        const source = logData.filename && logData.line_number 
          ? `${logData.filename}:${logData.line_number}`
          : undefined;
        
        return {
          timestamp,
          level,
          source,
          message: logData.message || line,
        };
      } catch (e) {
        // Fallback for non-JSON lines
        return {
          timestamp: new Date().toISOString().substring(0, 19),
          level: 'INFO' as const,
          source: undefined,
          message: line,
        };
      }
    });

    return NextResponse.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('[Logs API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
