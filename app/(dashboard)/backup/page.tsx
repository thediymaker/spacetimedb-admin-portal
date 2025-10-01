'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Download, 
  Upload, 
  Database, 
  Loader2, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Backup {
  backup_id: number;
  backup_name: string;
  description: string;
  created_by_str: string;
  created_at_ms: number;
  total_tables: number;
  total_records: number;
  is_complete: boolean;
}

interface RestoreLog {
  restore_id: number;
  backup_id: number;
  restored_by_str: string;
  started_at_ms: number;
  completed_at_ms?: number;
  tables_restored: number;
  records_restored: number;
  is_successful: boolean;
  error_message?: string;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restoreLogs, setRestoreLogs] = useState<RestoreLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null); // null = not checked yet

  // Create backup form
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Restore dialog
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBackupId, setDeleteBackupId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load backups on mount
  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setRefreshing(true);
    try {
      // Query backup_metadata table (no ORDER BY - SpacetimeDB doesn't support it)
      const response = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SELECT * FROM backup_metadata',
          maxRows: 100,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Log the full error for debugging
        console.error('SQL Query Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: '/api/sql/query',
          sql: 'SELECT * FROM backup_metadata',
        });
        
        // Check if table doesn't exist
        if (errorData.error?.includes('backup_metadata') || 
            errorData.details?.includes('backup_metadata') ||
            errorData.details?.includes('no such table') ||
            errorData.details?.includes('does not exist') ||
            errorData.details?.includes('unknown table')) {
          console.warn('Backup tables not found - they need to be created in SpacetimeDB');
          setBackups([]);
          setRestoreLogs([]);
          setTablesExist(false);
          return; // Don't show error toast for missing tables
        }
        
        throw new Error(errorData.error || 'Failed to load backups');
      }

      const data = await response.json();
      console.log('Backup data loaded:', data);
      
      // Tables exist and query succeeded
      setTablesExist(true);
      
      // Sort in JavaScript since SpacetimeDB doesn't support ORDER BY
      const sortedBackups = (data.rows || []).sort((a: Backup, b: Backup) => {
        return (b.created_at_ms || 0) - (a.created_at_ms || 0);
      });
      setBackups(sortedBackups);

      // Also load restore logs (no ORDER BY, no LIMIT)
      const logsResponse = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'SELECT * FROM backup_restore_log',
          maxRows: 100,
        }),
      });

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        // Sort and limit in JavaScript
        const sortedLogs = (logsData.rows || []).sort((a: RestoreLog, b: RestoreLog) => {
          return (b.started_at_ms || 0) - (a.started_at_ms || 0);
        }).slice(0, 10);
        setRestoreLogs(sortedLogs);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      toast.error('Failed to load backups');
    } finally {
      setRefreshing(false);
    }
  };

  const createBackup = async () => {
    if (!backupName.trim()) {
      toast.error('Backup name is required');
      return;
    }

    setCreating(true);
    try {
      toast.info('� Creating backup...');
      
      // Call the create_backup reducer (handles serialization internally)
      const response = await fetch('/api/reducers/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reducer: 'create_backup',
          params: [backupName.trim(), backupDescription.trim()],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || 'Failed to create backup';
        
        // Check for admin permission error
        if (errorMsg.includes('Admin') || errorMsg.includes('admin') || errorMsg.includes('require')) {
          toast.error('Admin Permission Required', {
            description: (
              <div className="space-y-2">
                <p>The create_backup reducer requires admin permissions.</p>
                <p className="font-semibold">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Add your identity to the admin table in SpacetimeDB, OR</li>
                  <li>Temporarily remove the <code className="bg-muted px-1 py-0.5 rounded">require_admin(ctx)?</code> check from your reducer</li>
                </ol>
                <p className="text-xs mt-2">Error: {errorMsg}</p>
              </div>
            ) as any,
            duration: 10000,
          });
          return;
        }
        
        throw new Error(errorMsg);
      }

      toast.success(`✅ Backup "${backupName}" created successfully`);
      setBackupName('');
      setBackupDescription('');
      await loadBackups();
    } catch (error: any) {
      console.error('Failed to create backup:', error);
      toast.error(error.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const initiateRestore = (backupId: number) => {
    setSelectedBackupId(backupId);
    setConfirmText('');
    setRestoreDialogOpen(true);
  };

  const restoreBackup = async () => {
    if (confirmText !== 'DELETE_ALL_DATA') {
      toast.error('You must type DELETE_ALL_DATA to confirm');
      return;
    }

    if (!selectedBackupId) return;

    setRestoring(true);
    try {
      const response = await fetch('/api/reducers/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reducer: 'restore_backup',
          params: [selectedBackupId, confirmText],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to restore backup');
      }

      toast.success('Backup restored successfully');
      setRestoreDialogOpen(false);
      await loadBackups();
    } catch (error: any) {
      console.error('Failed to restore backup:', error);
      toast.error(error.message || 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const initiateDelete = (backupId: number) => {
    setDeleteBackupId(backupId);
    setDeleteDialogOpen(true);
  };

  const deleteBackup = async () => {
    if (!deleteBackupId) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/reducers/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reducer: 'delete_backup',
          params: [deleteBackupId],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete backup');
      }

      toast.success('Backup deleted successfully');
      setDeleteDialogOpen(false);
      await loadBackups();
    } catch (error: any) {
      console.error('Failed to delete backup:', error);
      toast.error(error.message || 'Failed to delete backup');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Backup & Restore</h1>
          </div>
          <p className="text-muted-foreground">
            Reducer-based backup system for safe data management
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBackups}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Setup Required Alert - Only show if tables genuinely don't exist */}
      {tablesExist === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>⚠️ Backup system not set up yet!</strong></p>
              <p>You need to add 3 tables and 3 reducers to your SpacetimeDB module:</p>
              <div className="bg-background/50 p-3 rounded-md mt-2">
                <p className="font-semibold mb-1">Tables:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code className="bg-muted px-1 py-0.5 rounded">backup_metadata</code></li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">backup_table_snapshot</code></li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">backup_restore_log</code></li>
                </ul>
                <p className="font-semibold mt-2 mb-1">Reducers:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code className="bg-muted px-1 py-0.5 rounded">create_backup</code></li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">restore_backup</code></li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">delete_backup</code></li>
                </ul>
              </div>
              <p className="mt-3 text-sm">
                📚 <strong>See documentation:</strong>
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>→ <code className="bg-muted px-1 py-0.5 rounded">QUICK_SETUP_BACKUP_TABLES.md</code> - Copy-paste table definitions</li>
                <li>→ <code className="bg-muted px-1 py-0.5 rounded">RUST_IMPLEMENTATION_GUIDE.md</code> - Full implementation guide</li>
              </ul>
              <p className="mt-3 text-sm italic">
                Once you add the tables and publish your module, refresh this page.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>Reducer-based backups</strong> handle all data types correctly (Identity, Timestamp, Arrays).
              Backups are stored in the database and can be restored at any time.
              <strong className="text-amber-600"> Restore operations DELETE ALL DATA!</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Backup operations require admin permissions. If you get a permission error:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
              <li>Add your identity to the <code className="bg-muted px-1 py-0.5 rounded">admin</code> table, OR</li>
              <li>Temporarily remove <code className="bg-muted px-1 py-0.5 rounded">require_admin(ctx)?</code> from the reducer for testing</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Backup</CardTitle>
          <CardDescription>
            Capture a snapshot of your entire database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-name">Backup Name</Label>
            <Input
              id="backup-name"
              placeholder="e.g., pre-deployment-2025-10-01"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              maxLength={128}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backup-description">Description (Optional)</Label>
            <Textarea
              id="backup-description"
              placeholder="e.g., Backup before major feature release"
              value={backupDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBackupDescription(e.target.value)}
              maxLength={512}
              rows={3}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={createBackup}
            disabled={creating || !backupName.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Create Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>
            {backups.length === 0 ? 'No backups found' : `${backups.length} backup(s) available`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups yet. Create your first backup above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Tables/Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.backup_id}>
                    <TableCell className="font-mono">{backup.backup_id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{backup.backup_name}</div>
                        {backup.description && (
                          <div className="text-sm text-muted-foreground">
                            {backup.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(backup.created_at_ms)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {backup.total_tables} / {backup.total_records}
                    </TableCell>
                    <TableCell>
                      {backup.is_complete ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          In Progress
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => initiateRestore(backup.backup_id)}
                          disabled={!backup.is_complete}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => initiateDelete(backup.backup_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Restore History */}
      {restoreLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Restore History</CardTitle>
            <CardDescription>
              Recent restore operations (last 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Backup ID</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tables/Records</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restoreLogs.map((log) => (
                  <TableRow key={log.restore_id}>
                    <TableCell className="font-mono">{log.backup_id}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(log.started_at_ms)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.completed_at_ms
                        ? `${Math.round((log.completed_at_ms - log.started_at_ms) / 1000)}s`
                        : 'In progress'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.tables_restored} / {log.records_restored}
                    </TableCell>
                    <TableCell>
                      {log.is_successful ? (
                        <Badge variant="default" className="bg-green-600">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Failed
                        </Badge>
                      )}
                      {log.error_message && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.error_message}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Restore Operation
            </DialogTitle>
            <DialogDescription>
              This is a <strong>DESTRUCTIVE</strong> operation that will <strong>DELETE ALL CURRENT DATA</strong>
              and replace it with backup data.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All current data will be permanently deleted</li>
                <li>This action cannot be undone</li>
                <li>Make a backup first if you want to preserve current data</li>
                <li>Only database owners can perform this operation</li>
              </ul>
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <code className="bg-muted px-1 py-0.5 rounded">DELETE_ALL_DATA</code> to confirm
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE_ALL_DATA"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={restoreBackup}
              disabled={restoring || confirmText !== 'DELETE_ALL_DATA'}
            >
              {restoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Restore Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteBackup}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




