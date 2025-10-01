/**
 * Connection Test Page
 * Tests SpacetimeDB HTTP API connection and table access
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: any;
}

export default function ConnectionTestPage() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (name: string, status: 'success' | 'error', message?: string, details?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, status, message, details } : r);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Check environment variables
    console.log('=== Connection Test Started ===');
    const envVars = {
      NEXT_PUBLIC_SPACETIME_HTTP_API: process.env.NEXT_PUBLIC_SPACETIME_HTTP_API,
      NEXT_PUBLIC_SPACETIME_MODULE: process.env.NEXT_PUBLIC_SPACETIME_MODULE,
    };
    console.log('Environment:', envVars);
    
    if (!envVars.NEXT_PUBLIC_SPACETIME_HTTP_API || !envVars.NEXT_PUBLIC_SPACETIME_MODULE) {
      updateResult('Environment', 'error', 'Missing environment variables');
      setTesting(false);
      return;
    }
    updateResult('Environment', 'success', 'Environment variables configured');

    // Test 2: Query schema/tables
    try {
      const schemaResponse = await fetch(`${envVars.NEXT_PUBLIC_SPACETIME_HTTP_API}/${envVars.NEXT_PUBLIC_SPACETIME_MODULE}/schema?version=9`);
      console.log('Schema response:', schemaResponse.status, schemaResponse.statusText);
      
      if (!schemaResponse.ok) {
        const errorText = await schemaResponse.text();
        console.error('Schema error:', errorText);
        updateResult('Schema Access', 'error', `HTTP ${schemaResponse.status}: ${schemaResponse.statusText}`, errorText);
      } else {
        const schema = await schemaResponse.json();
        const tableNames = schema.tables?.map((t: any) => t.name) || [];
        console.log('Available tables:', tableNames);
        updateResult('Schema Access', 'success', `Found ${tableNames.length} tables`, tableNames);
      }
    } catch (error: any) {
      console.error('Schema fetch error:', error);
      updateResult('Schema Access', 'error', error.message);
    }

    // Test 3: Query a known table (try to list all tables)
    try {
      const response = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SHOW TABLES',
          maxRows: 100,
        }),
      });
      
      console.log('SHOW TABLES response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('SHOW TABLES error:', errorData);
        updateResult('SQL Query (SHOW TABLES)', 'error', `HTTP ${response.status}`, errorData);
      } else {
        const data = await response.json();
        console.log('SHOW TABLES result:', data);
        updateResult('SQL Query (SHOW TABLES)', 'success', `Query executed`, data);
      }
    } catch (error: any) {
      console.error('SQL query error:', error);
      updateResult('SQL Query (SHOW TABLES)', 'error', error.message);
    }

    // Test 4: Try to query backup_metadata table
    try {
      const response = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SELECT * FROM backup_metadata LIMIT 1',
          maxRows: 1,
        }),
      });
      
      console.log('backup_metadata query response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('backup_metadata error:', errorData);
        updateResult('Query backup_metadata', 'error', `HTTP ${response.status}`, errorData);
      } else {
        const data = await response.json();
        console.log('backup_metadata result:', data);
        updateResult('Query backup_metadata', 'success', `Table accessible (${data.rows?.length || 0} rows)`, data);
      }
    } catch (error: any) {
      console.error('backup_metadata query error:', error);
      updateResult('Query backup_metadata', 'error', error.message);
    }

    // Test 5: Direct SpacetimeDB SQL endpoint test
    try {
      const url = `${envVars.NEXT_PUBLIC_SPACETIME_HTTP_API}/${envVars.NEXT_PUBLIC_SPACETIME_MODULE}/sql`;
      console.log('Testing direct SQL endpoint:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'SELECT * FROM backup_metadata LIMIT 1',
      });
      
      console.log('Direct SQL response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Direct SQL error:', errorText);
        updateResult('Direct SQL Endpoint', 'error', `HTTP ${response.status}`, errorText);
      } else {
        const data = await response.json();
        console.log('Direct SQL result:', data);
        updateResult('Direct SQL Endpoint', 'success', 'Can query directly', data);
      }
    } catch (error: any) {
      console.error('Direct SQL error:', error);
      updateResult('Direct SQL Endpoint', 'error', error.message);
    }

    console.log('=== Connection Test Completed ===');
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Connection Test</h1>
        </div>
        <p className="text-muted-foreground">
          Test SpacetimeDB HTTP API connection and backup table access
        </p>
      </div>

      <Alert>
        <AlertDescription>
          This page tests the connection to your SpacetimeDB instance and checks if backup tables are accessible.
          Check the browser console (F12) for detailed logs.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Run Tests</CardTitle>
          <CardDescription>
            Tests environment, schema access, SQL queries, and backup tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Connection Tests'
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {results.filter(r => r.status === 'success').length} / {results.length} tests passed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result) => (
              <div key={result.name} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="mt-0.5">
                  {result.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {result.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {result.status === 'pending' && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{result.name}</span>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                  {result.message && (
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  )}
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:underline">
                        Show details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                        {typeof result.details === 'string' 
                          ? result.details 
                          : JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
