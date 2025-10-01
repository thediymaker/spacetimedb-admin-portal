/**
 * Backup & Restore page
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Database } from 'lucide-react';

export default function BackupPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Backup & Restore</h1>
        </div>
        <p className="text-muted-foreground">
          Export and import your database data
        </p>
      </div>

      {/* Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Database</CardTitle>
          <CardDescription>
            Export your database tables to a JSONL archive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a backup of your entire database or selected tables. Backups include both schema and data in a compressed format.
          </p>
          <Button className="w-full" disabled>
            <Download className="mr-2 h-4 w-4" />
            Create Backup
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Coming soon
          </p>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle>Restore Database</CardTitle>
          <CardDescription>
            Import data from a backup archive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Restore your database from a previous backup. You can choose to replace existing data or append to it.
          </p>
          <Button variant="outline" className="w-full" disabled>
            <Upload className="mr-2 h-4 w-4" />
            Select Backup File
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Coming soon
          </p>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Format</CardTitle>
          <CardDescription>
            SpacetimeDB-native backup structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Backups include:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>WASM module (schema and logic)</li>
              <li>Table data in JSONL format</li>
              <li>Manifest with metadata</li>
              <li>Integrity checksums</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




