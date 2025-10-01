/**
 * API Route: Execute bulk SQL operations
 * POST /api/sql/bulk
 */

import { NextResponse } from 'next/server';
import { httpClient } from '@/lib/spacetime/http-client';
import type { BulkRequest } from '@/types/api';
import type { BulkOperationResult } from '@/types/spacetime';

const MAX_BULK_OPERATIONS = 1000; // Safety limit

export async function POST(request: Request) {
  try {
    const body: BulkRequest = await request.json();
    const { operations, transactional, dryRun = false } = body;

    // Validate operations
    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'Operations array is required' },
        { status: 400 }
      );
    }

    if (operations.length > MAX_BULK_OPERATIONS) {
      return NextResponse.json(
        {
          error: `Too many operations. Maximum is ${MAX_BULK_OPERATIONS}`,
        },
        { status: 400 }
      );
    }

    // Dry run mode
    if (dryRun) {
      const report = {
        totalOperations: operations.length,
        estimatedAffectedRows: 0,
        warnings: [] as string[],
      };

      // Validate each operation
      for (const op of operations) {
        if (!op.sql || typeof op.sql !== 'string') {
          report.warnings.push('Invalid SQL statement found');
        }
      }

      const response: BulkOperationResult = {
        results: [],
        dryRunReport: report,
      };

      return NextResponse.json(response);
    }

    // Execute operations
    const results: BulkOperationResult['results'] = [];
    const errors: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      try {
        const result = await httpClient.mutate(op.sql, op.params);

        results.push({
          success: result.success,
          affectedRows: result.affectedRows,
          error: result.error,
        });

        if (!result.success && result.error) {
          errors.push(`Operation ${i + 1}: ${result.error}`);

          // In transactional mode, stop on first error
          if (transactional) {
            break;
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        results.push({
          success: false,
          affectedRows: 0,
          error: errorMessage,
        });

        errors.push(`Operation ${i + 1}: ${errorMessage}`);

        // In transactional mode, stop on first error
        if (transactional) {
          break;
        }
      }
    }

    const response: BulkOperationResult = {
      results,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Bulk operation failed:', error);

    return NextResponse.json(
      {
        error: 'Bulk operation execution failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}




