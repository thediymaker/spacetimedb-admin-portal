/**
 * Recent Activity Feed
 * Shows live server logs from SpacetimeDB
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Loader2, RefreshCw, AlertCircle, Info, AlertTriangle, ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source?: string;
}

type SortField = 'timestamp' | 'level' | 'message';
type SortOrder = 'asc' | 'desc';

export function RecentActivity() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true); // Enabled by default
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(50); // Show 50 logs per page
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Newest first by default

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setError(null);
      } else {
        const errorData = await response.json();
        if (errorData.details?.includes('Identity does not own database') || 
            errorData.details?.includes('Authorization')) {
          setError('authentication_required');
        } else {
          setError(`Failed to fetch logs: ${response.statusText}`);
        }
        console.error('Failed to fetch logs:', response.statusText);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setError('Failed to connect to logs API');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter and sort logs
  const filteredAndSortedLogs = logs
    .filter(log => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.level.toLowerCase().includes(query) ||
        log.timestamp.toLowerCase().includes(query) ||
        (log.source && log.source.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'level':
          const levelOrder = { 'ERROR': 0, 'WARN': 1, 'INFO': 2, 'DEBUG': 3 };
          comparison = (levelOrder[a.level] || 4) - (levelOrder[b.level] || 4);
          break;
        case 'message':
          comparison = a.message.localeCompare(b.message);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = filteredAndSortedLogs.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortOrder]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'destructive';
      case 'WARN':
        return 'warning';
      case 'INFO':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Server Logs
            </CardTitle>
            <CardDescription>
              Live server logs from SpacetimeDB
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              disabled={!!error}
            >
              {autoRefresh && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchLogs()}
              disabled={isLoading || !!error}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Search and Sort Controls */}
        <div className="border-b bg-muted/30 px-6 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by message, level, timestamp, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Sort Controls */}
            <div className="flex gap-2">
              <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Timestamp</SelectItem>
                  <SelectItem value="level">Level</SelectItem>
                  <SelectItem value="message">Message</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Results Summary */}
          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              Found {filteredAndSortedLogs.length} of {logs.length} logs
            </div>
          )}
        </div>
        
        <ScrollArea className="h-[65vh]">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-2 max-w-lg">
                  <h3 className="font-medium">Authentication Required</h3>
                  <p className="text-sm text-muted-foreground">
                    {error === 'authentication_required' 
                      ? 'Server logs require database owner authentication.'
                      : error
                    }
                  </p>
                  {error === 'authentication_required' && (
                    <div className="mt-4 rounded-lg bg-muted p-4 text-left text-xs space-y-2">
                      <p className="font-medium">To enable logs:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Run <code className="bg-background px-1.5 py-0.5 rounded">spacetime identity show</code> to get your token</li>
                        <li>Add it to <code className="bg-background px-1.5 py-0.5 rounded">.env.local</code>:</li>
                      </ol>
                      <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
SPACETIME_AUTH_TOKEN=your-token-here
                      </pre>
                      <p className="text-muted-foreground">Then restart the dev server.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : filteredAndSortedLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No logs match your search' : 'No recent logs'}
              </div>
            ) : (
              <div className="space-y-0.5">
                {currentLogs.map((log, idx) => (
                  <div
                    key={`${log.timestamp}-${startIndex + idx}`}
                    className="flex items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="pt-0.5 shrink-0">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 text-xs">
                        <span className="text-muted-foreground font-mono shrink-0">
                          {log.timestamp.split('T')[1] || log.timestamp}
                        </span>
                        <span className="text-foreground break-words">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Pagination Controls */}
        {filteredAndSortedLogs.length > 0 && totalPages > 1 && (
          <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} logs
              {searchQuery && ` (filtered from ${logs.length} total)`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
