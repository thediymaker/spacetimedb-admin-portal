/**
 * Reducer detail page
 * Displays reducer information and allows calling it
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useReducers } from '@/hooks/use-reducers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Zap, Loader2, AlertCircle, CheckCircle2, Play, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ReducerPage() {
  const params = useParams();
  const reducerName = params.name as string;
  const { data, isLoading, error } = useReducers();
  
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading reducer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load reducers: {error instanceof Error ? error.message : String(error)}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reducer = data?.reducers.find((r) => r.name === reducerName);

  if (!reducer) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Alert className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Reducer "{reducerName}" not found
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleParamChange = (paramName: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      // Build parameters array
      const params = reducer.params.map((param, idx) => {
        const paramKey = param.name || `param_${idx}`;
        const value = paramValues[paramKey];
        
        // Try to parse the value based on type
        // Check for integer types (u8, u16, u32, u64, i8, i16, i32, i64, etc.)
        if (/^[ui]\d+$/.test(param.type)) {
          return parseInt(value, 10);
        }
        // Check for float types (f32, f64)
        if (/^f\d+$/.test(param.type)) {
          return parseFloat(value);
        }
        if (param.type === 'bool') {
          return value === 'true';
        }
        // Return string value
        return value || '';
      });
      const response = await fetch('/api/reducers/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reducer: reducerName,
          params,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to execute reducer');
      }

      setExecutionResult({
        success: true,
        message: 'Reducer executed successfully',
        data: result,
      });

      toast.success('Reducer executed successfully');
    } catch (error) {
      console.error('[Reducer] Execution error:', error);
      
      setExecutionResult({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });

      toast.error('Failed to execute reducer');
    } finally {
      setIsExecuting(false);
    }
  };

  const isFormValid = reducer.params.every((param, idx) => {
    const paramKey = param.name || `param_${idx}`;
    const value = paramValues[paramKey];
    return value !== undefined && value !== '';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6" />
            <h1 className="text-3xl font-bold">{reducerName}</h1>
          </div>
          <p className="text-muted-foreground">
            Call this reducer to execute actions on your SpacetimeDB module
          </p>
        </div>
        {reducer.isLifecycle && (
          <Badge variant="secondary">
            Lifecycle: {reducer.lifecycleType}
          </Badge>
        )}
      </div>

      {/* Lifecycle Warning */}
      {reducer.isLifecycle && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This is a lifecycle reducer ({reducer.lifecycleType}). It is automatically called by SpacetimeDB 
            and should not typically be invoked manually.
          </AlertDescription>
        </Alert>
      )}

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
          <CardDescription>
            {reducer.params.length === 0
              ? 'This reducer does not accept any parameters'
              : 'Provide values for the reducer parameters'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reducer.params.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No parameters required. Click execute to call this reducer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reducer.params.map((param, idx) => {
                  const paramName = param.name || `param_${idx}`;
                  return (
                    <TableRow key={paramName}>
                      <TableCell className="font-medium">
                        {param.name || <span className="text-muted-foreground italic">unnamed</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{param.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder={`Enter ${param.type} value`}
                          value={paramValues[paramName] || ''}
                          onChange={(e) => handleParamChange(paramName, e.target.value)}
                          className="max-w-md"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Execute Button - Only show for non-lifecycle reducers */}
      {!reducer.isLifecycle && (
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExecute}
            disabled={isExecuting || (!isFormValid && reducer.params.length > 0)}
            size="lg"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute Reducer
              </>
            )}
          </Button>
          {!isFormValid && reducer.params.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Please fill in all parameters
            </p>
          )}
        </div>
      )}

      {/* Execution Result */}
      {executionResult && (
        <Alert variant={executionResult.success ? 'default' : 'destructive'}>
          {executionResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{executionResult.message}</p>
              {executionResult.data && (
                <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-auto">
                  {JSON.stringify(executionResult.data, null, 2)}
                </pre>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
