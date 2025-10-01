/**
 * Settings page
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    uri: process.env.NEXT_PUBLIC_SPACETIME_URI || '',
    module: process.env.NEXT_PUBLIC_SPACETIME_MODULE || '',
    httpApi: process.env.NEXT_PUBLIC_SPACETIME_HTTP_API || '',
  });

  const handleSave = () => {
    toast.info('Settings are configured via environment variables');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Configure your SpacetimeDB connection
        </p>
      </div>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Configuration</CardTitle>
          <CardDescription>
            These settings are read from environment variables. Update your .env.local file to change them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uri">WebSocket URI</Label>
            <Input
              id="uri"
              value={settings.uri}
              onChange={(e) => setSettings({ ...settings, uri: e.target.value })}
              placeholder="ws://127.0.0.1:3000"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Environment variable: NEXT_PUBLIC_SPACETIME_URI
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module">Module Name</Label>
            <Input
              id="module"
              value={settings.module}
              onChange={(e) => setSettings({ ...settings, module: e.target.value })}
              placeholder="your-module-name"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Environment variable: NEXT_PUBLIC_SPACETIME_MODULE
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="httpApi">HTTP API URL</Label>
            <Input
              id="httpApi"
              value={settings.httpApi}
              onChange={(e) => setSettings({ ...settings, httpApi: e.target.value })}
              placeholder="http://127.0.0.1:3000/database"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Environment variable: NEXT_PUBLIC_SPACETIME_HTTP_API
            </p>
          </div>

          <Button onClick={handleSave} className="w-full" disabled>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>
            Configure caching and performance options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Cache TTL</Label>
              <p className="text-sm text-muted-foreground">
                Schema cache time-to-live: {process.env.NEXT_PUBLIC_CACHE_TTL_MINUTES || 10} minutes
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Max Live Rows</Label>
              <p className="text-sm text-muted-foreground">
                Real-time subscription limit: {Number(process.env.NEXT_PUBLIC_MAX_LIVE_ROWS || 10000).toLocaleString()} rows
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





