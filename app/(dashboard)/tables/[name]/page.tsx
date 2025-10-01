/**
 * Table view page
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useTable } from '@/hooks/use-tables';
import { useTableData } from '@/hooks/use-table-data';
import { QueryBuilder } from '@/components/query-builder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Database, AlertTriangle, Filter, Zap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TablePageProps {
  params: Promise<{
    name: string;
  }>;
}

export default function TablePage({ params }: TablePageProps) {
  const resolvedParams = use(params);
  const tableName = resolvedParams.name;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [customQuery, setCustomQuery] = useState<string | null>(null);
  const [queryResults, setQueryResults] = useState<any>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const maxRows = 10000; // Maximum rows to fetch from server

  // Reset page when table or page size changes
  useEffect(() => {
    setPage(1);
  }, [tableName, pageSize]);

  // Auto-refresh: Poll for changes every 10 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!customQuery && !isExecutingQuery) {
        refetch();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, customQuery, isExecutingQuery]);

  const { data: schemaData, isLoading: isSchemaLoading } = useTable(tableName);
  const { data: tableData, isLoading: isDataLoading, error, refetch } = useTableData(tableName, maxRows);

  const isLoading = isSchemaLoading || isDataLoading;

  // Use custom query results if available, otherwise use default table data
  const displayData = queryResults || tableData;

  const handleRefresh = async () => {
    try {
      // Clear custom query results and refetch default data
      setQueryResults(null);
      setCustomQuery(null);
      setPage(1);
      await refetch();
      toast.success('Table data refreshed');
    } catch (error) {
      toast.error('Failed to refresh table data');
    }
  };

  const handleAutoRefreshToggle = (enabled: boolean) => {
    setAutoRefresh(enabled);
    if (enabled) {
      toast.success('Auto-refresh enabled', {
        description: 'Table will refresh every 10 seconds'
      });
    } else {
      toast.info('Auto-refresh disabled');
    }
  };

  const handleExecuteQuery = async (sql: string) => {
    setIsExecutingQuery(true);
    
    try {
      const isDeleteQuery = sql.trim().toLowerCase().startsWith('delete');
      
      if (isDeleteQuery) {
        // Handle DELETE query
        toast.info('Executing DELETE operation...');
        
        const response = await fetch('/api/sql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, maxRows }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Delete operation failed');
        }

        const result = await response.json();
        
        toast.success('Rows deleted successfully!', {
          description: 'Data has been removed from the table'
        });

        // Refresh the table data
        await refetch();
        setQueryResults(null);
        setCustomQuery(null);
      } else {
        // Handle SELECT query
        setCustomQuery(sql);
        toast.info('Executing custom query...');
        
        const response = await fetch('/api/sql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, maxRows }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Query failed');
        }

        const results = await response.json();
        setQueryResults(results);
        setPage(1); // Reset to first page
        
        toast.success(`Query executed successfully!`, {
          description: `${results.rows?.length || 0} rows returned`
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute query';
      toast.error('Query Error', { description: errorMsg });
      console.error('Query execution error:', error);
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const handleSelectRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_: any, idx: number) => idx)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    
    setIsDeleting(true);
    try {
      // Get primary key column (if exists)
      const primaryKeyCol = table?.columns.find(col => col.isPrimary);
      
      // Build DELETE queries for selected rows
      const selectedRowsData = Array.from(selectedRows).map(idx => rows[idx]);
      
      const deletePromises = selectedRowsData.map(async (row) => {
        let whereConditions: string[] = [];
        
        // Helper function to check if a column type is a simple/primitive type
        const isSimpleType = (colType: string): boolean => {
          const type = colType.toLowerCase();
          // Exclude complex SpacetimeDB types that can't be used in WHERE clauses
          const complexTypes = ['timestamp', 'identity', 'duration', 'struct', 'enum', 'complex'];
          return !complexTypes.some(complex => type.includes(complex));
        };
        
        if (primaryKeyCol) {
          // Use primary key if available - but check if it's a simple type
          const pkType = primaryKeyCol.dataType || '';
          
          if (isSimpleType(pkType)) {
            const pkValue = row[primaryKeyCol.name];
            const needsQuotes = pkType.toLowerCase().includes('string') || 
                               pkType.toLowerCase().includes('text');
            const value = needsQuotes ? `'${String(pkValue).replace(/'/g, "''")}'` : pkValue;
            whereConditions.push(`${primaryKeyCol.name} = ${value}`);
          }
        }
        
        // If we don't have a WHERE condition yet (no PK or PK is complex type)
        // Use simple columns to uniquely identify the row
        if (whereConditions.length === 0) {
          columns.forEach((col: any) => {
            const colType = col.dataType || col.type || '';
            
            // Skip complex types that SpacetimeDB doesn't support in WHERE clauses
            if (!isSimpleType(colType)) {
              return;
            }
            
            const colValue = row[col.name];
            
            if (colValue === null || colValue === undefined) {
              whereConditions.push(`${col.name} IS NULL`);
            } else {
              const needsQuotes = colType.toLowerCase().includes('string') || 
                                 colType.toLowerCase().includes('text');
              
              if (needsQuotes) {
                const escapedValue = String(colValue).replace(/'/g, "''");
                whereConditions.push(`${col.name} = '${escapedValue}'`);
              } else {
                whereConditions.push(`${col.name} = ${colValue}`);
              }
            }
          });
        }
        
        // Safety check: ensure we have at least one WHERE condition
        if (whereConditions.length === 0) {
          throw new Error('Cannot build WHERE clause: No simple columns available for deletion');
        }
        
        const sql = `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')}`;
        
        const response = await fetch('/api/sql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, maxRows: 1 }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Delete] Error response:', errorData);
          
          // Check if DELETE is not supported by SpacetimeDB
          if (errorData.needsReducer) {
            throw new Error('DELETE_NOT_SUPPORTED: ' + (errorData.details || 'Use reducers for delete operations'));
          }
          
          // Check for authentication errors
          if (errorData.needsAuth) {
            throw new Error('AUTH_REQUIRED: ' + (errorData.details || 'Authentication token required'));
          }
          
          // Check for authorization errors (SpacetimeDB requires reducers for DML)
          const errorDetails = errorData.details || errorData.error || '';
          if (errorDetails.includes('Only owners are authorized') || 
              errorDetails.includes('SQL DML') ||
              errorDetails.includes('not authorized')) {
            throw new Error('DELETE_NOT_SUPPORTED: SpacetimeDB requires delete operations to be implemented as reducers');
          }
          
          throw new Error(errorDetails || 'Failed to delete row');
        }
        
        await response.json();
      });

      await Promise.all(deletePromises);

      toast.success(`Successfully deleted ${selectedRows.size} row(s)`);
      
      // Clear selection and refresh
      setSelectedRows(new Set());
      setShowDeleteDialog(false);
      await refetch();
    } catch (error) {
      console.error('Bulk delete error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for authentication errors
      if (errorMessage.includes('AUTH_REQUIRED')) {
        toast.error('🔑 Authentication Required', {
          description: (
            <div className="space-y-2">
              <p>DELETE operations require owner authentication.</p>
              <p className="font-semibold">To enable delete functionality:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Get your SpacetimeDB identity token: <code className="bg-muted px-1 py-0.5 rounded">spacetime identity show</code></li>
                <li>Set environment variable: <code className="bg-muted px-1 py-0.5 rounded">SPACETIME_AUTH_TOKEN=your_token</code></li>
                <li>Restart the Next.js dev server</li>
              </ol>
            </div>
          ) as any,
          duration: 15000,
        });
      } else if (errorMessage.includes('DELETE_NOT_SUPPORTED')) {
        toast.error('🔒 Reducer Required for Delete Operations', {
          description: (
            <div className="space-y-2">
              <p>SpacetimeDB does not allow DELETE via SQL for security reasons.</p>
              <p className="font-semibold">To enable delete functionality:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a delete reducer in your SpacetimeDB module (Rust)</li>
                <li>Example: <code className="text-xs bg-muted px-1 py-0.5 rounded">delete_player(player_id: u32)</code></li>
                <li>Deploy your updated module</li>
                <li>Use the Reducers page to call it</li>
              </ol>
            </div>
          ) as any,
          duration: 15000,
        });
      } else {
        toast.error('Failed to delete rows', {
          description: errorMessage
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading table data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error Loading Table</CardTitle>
            </div>
            <CardDescription>
              Failed to load table data for {tableName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleRefresh} className="flex-1">
                Retry
              </Button>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const table = schemaData?.table;
  const allRows = displayData?.rows || [];
  const columns = displayData?.columns || table?.columns || [];
  const totalRows = displayData?.totalRows || 0;
  const fetchedRows = displayData?.fetchedRows || 0;
  const truncated = displayData?.truncated || false;
  
  // Client-side pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const rows = allRows.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{tableName}</h1>
            </div>
            <p className="text-muted-foreground">
              {truncated ? (
                <>
                  Showing {fetchedRows.toLocaleString()} of {totalRows.toLocaleString()} rows · {columns.length} columns
                </>
              ) : (
                <>
                  {totalRows.toLocaleString()} rows · {columns.length} columns
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Delete selected button */}
          {selectedRows.size > 0 && (
            <Button 
              onClick={() => setShowDeleteDialog(true)} 
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedRows.size} {selectedRows.size === 1 ? 'Row' : 'Rows'}
            </Button>
          )}
          
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Zap className={`h-4 w-4 ${autoRefresh ? 'text-green-600 animate-pulse' : 'text-muted-foreground'}`} />
            <Label htmlFor="auto-refresh" className="cursor-pointer text-sm">
              Auto-refresh (10s)
            </Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={handleAutoRefreshToggle}
            />
          </div>
          
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Truncation Warning */}
      {truncated && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>Large Table Detected:</strong> This table has <strong>{totalRows.toLocaleString()}</strong> rows. 
            Only the first <strong>{maxRows.toLocaleString()}</strong> rows are displayed to prevent performance issues.
            {totalRows > maxRows && (
              <span className="ml-1">
                ({(totalRows - maxRows).toLocaleString()} rows hidden)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Table Schema Info */}
      <Card>
        <CardHeader>
          <CardTitle>Schema</CardTitle>
          <CardDescription>Column definitions and metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {table?.columns.map((col) => (
              <div key={col.name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{col.name}</span>
                  {col.isPrimary && (
                    <Badge variant="default" className="text-xs">
                      PK
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {col.dataType}
                  </Badge>
                  {col.nullable && (
                    <span className="text-xs text-muted-foreground">nullable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Query Builder</CardTitle>
              <CardDescription>
                Build custom queries using schema-based dropdowns
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQueryBuilder(!showQueryBuilder)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showQueryBuilder ? 'Hide' : 'Show'} Query Builder
            </Button>
          </div>
        </CardHeader>
        {showQueryBuilder && (
          <CardContent>
            <QueryBuilder 
              tableName={tableName} 
              columns={columns} 
              onExecute={handleExecuteQuery}
            />
          </CardContent>
        )}
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Data</CardTitle>
                {customQuery && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    Custom Query
                  </Badge>
                )}
              </div>
              <CardDescription>
                {customQuery ? (
                  <span className="flex items-center gap-2">
                    Showing results from custom query
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={handleRefresh}
                    >
                      Clear and show all data
                    </Button>
                  </span>
                ) : (
                  'Table data fetched via SQL queries'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No data yet</h3>
              <p className="mb-4 max-w-md text-sm text-muted-foreground">
                This table doesn't have any rows yet.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.size === rows.length && rows.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                        />
                      </TableHead>
                      <TableHead className="w-12">#</TableHead>
                      {columns.map((col: any) => (
                        <TableHead key={col.name || col.type}>
                          <div className="flex flex-col">
                            <span className="font-medium">{col.name}</span>
                            <span className="text-xs text-muted-foreground">{col.dataType || col.type}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row: any, index: number) => (
                      <TableRow 
                        key={index}
                        className={selectedRows.has(index) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(index)}
                            onCheckedChange={() => handleSelectRow(index)}
                            aria-label={`Select row ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{(page - 1) * pageSize + index + 1}</TableCell>
                        {columns.map((col: any) => (
                          <TableCell key={col.name || col.type}>
                            {formatCellValue(row[col.name])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {fetchedRows > 0 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, fetchedRows)} of {fetchedRows} {truncated && `(${totalRows} total)`} rows
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page:</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value: string) => setPageSize(Number(value))}
                      >
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {Math.ceil(fetchedRows / pageSize)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * pageSize >= fetchedRows}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRows.size} {selectedRows.size === 1 ? 'row' : 'rows'}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedRows.size} {selectedRows.size === 1 ? 'Row' : 'Rows'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCellValue(value: unknown, columnName?: string): string {
  if (value === null || value === undefined) {
    return '—';
  }

  // Handle timestamps (microseconds since Unix epoch)
  // SpacetimeDB returns timestamps as large integers (microseconds)
  if (typeof value === 'number' && value > 1000000000000) {
    try {
      // Convert microseconds to milliseconds for JavaScript Date
      const date = new Date(value / 1000);
      
      // Check if it's a valid date
      if (!isNaN(date.getTime())) {
        // Format as: "Jan 15, 2024, 3:45 PM"
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (error) {
      // If date parsing fails, fall through to default
    }
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}
