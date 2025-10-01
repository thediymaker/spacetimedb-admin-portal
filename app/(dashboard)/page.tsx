/**
 * Dashboard home page
 */

'use client';

import Link from 'next/link';
import { useTables, useRefreshTables } from '@/hooks/use-tables';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RecentActivity } from '@/components/recent-activity';

export default function DashboardPage() {
  const { data, isLoading, error } = useTables();
  const refreshTables = useRefreshTables();

  const handleRefresh = async () => {
    try {
      await refreshTables.mutateAsync();
      toast.success('Tables refreshed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh tables';
      toast.error(errorMsg);
      console.error('Refresh error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Connection Error</CardTitle>
            </div>
            <CardDescription>
              Failed to connect to SpacetimeDB. Please check your configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">Error Details:</p>
              <p className="mt-2 text-sm text-muted-foreground font-mono">
                {error instanceof Error ? error.message : JSON.stringify(error)}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Current Configuration:</p>
              <div className="mt-2 space-y-1 text-xs font-mono">
                <div>URI: {process.env.NEXT_PUBLIC_SPACETIME_URI || 'NOT SET'}</div>
                <div>Module: {process.env.NEXT_PUBLIC_SPACETIME_MODULE || 'NOT SET'}</div>
                <div>HTTP API: {process.env.NEXT_PUBLIC_SPACETIME_HTTP_API || 'NOT SET'}</div>
              </div>
            </div>
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">Common Issues:</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                <li>SpacetimeDB server not running (run: spacetime start)</li>
                <li>Module not published (run: spacetime publish &lt;module-name&gt;)</li>
                <li>Incorrect module name in environment variables</li>
                <li>HTTP API URL format incorrect</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} className="flex-1">
                Retry Connection
              </Button>
              <Link href="/settings" className="flex-1">
                <Button variant="outline" className="w-full">
                  Check Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tables = data?.tables || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your SpacetimeDB tables and data
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshTables.isPending}
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshTables.isPending ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-xs text-muted-foreground">
              Active database tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schema Cache</CardTitle>
            <Badge variant={data?.cached ? 'default' : 'secondary'}>
              {data?.cached ? 'Cached' : 'Fresh'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.cached ? 'Active' : 'Updated'}
            </div>
            <p className="text-xs text-muted-foreground">
              Schema discovery cache status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Logs */}
      <RecentActivity />
    </div>
  );
}
