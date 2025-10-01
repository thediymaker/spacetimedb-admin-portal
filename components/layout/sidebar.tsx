/**
 * Sidebar navigation component
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Database,
  Table,
  Settings,
  Download,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useConnection } from '@/hooks/use-connection';
import { useTables } from '@/hooks/use-tables';
import { useReducers } from '@/hooks/use-reducers';
import { useReducerMetadata } from '@/hooks/use-reducer-metadata';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { data: health, isLoading: isHealthLoading } = useConnection();
  const { data: tablesData, isLoading: isTablesLoading } = useTables();
  const { data: reducersData, isLoading: isReducersLoading } = useReducers();
  const { data: reducerMetadata, isLoading: isMetaLoading } = useReducerMetadata();

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openTableGroups, setOpenTableGroups] = useState<Record<string, boolean>>({});

  const isConnected = health?.status === 'connected';
  const hasError = health?.status === 'error';
  const tables = tablesData?.tables || [];
  const reducers = reducersData?.reducers || [];

  const metaByName = useMemo(() => {
    const map = new Map<string, {
      category: string | null;
      subcategory: string | null;
      required_role: string | null;
      description: string | null;
      tags: string | null;
      sort_order: number | null;
      is_deprecated: boolean | null;
    }>();
    (reducerMetadata?.rows || []).forEach((row) => {
      map.set(row.reducer_name, {
        category: row.category ?? null,
        subcategory: row.subcategory ?? null,
        required_role: row.required_role ?? null,
        description: row.description ?? null,
        tags: row.tags ?? null,
        sort_order: row.sort_order ?? null,
        is_deprecated: row.is_deprecated ?? null,
      });
    });
    return map;
  }, [reducerMetadata]);

  const groupedReducers = useMemo(() => {
    if (!reducers.length || !metaByName.size) return null;

    const groups: Record<string, { name: string; sort_order: number; is_deprecated: boolean }[]> = {};
    for (const r of reducers) {
      const meta = metaByName.get(r.name);
      const isDeprecated = Boolean(meta?.is_deprecated);
      if (isDeprecated) continue;
      const rawCategory = (meta?.category || '').trim().toLowerCase();
      const category = rawCategory || 'other';
      const sortOrder = meta?.sort_order ?? 9999;
      (groups[category] ||= []).push({ name: r.name, sort_order: sortOrder, is_deprecated: false });
    }
    // sort within categories
    Object.values(groups).forEach(list => list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
    return groups;
  }, [reducers, metaByName]);

  const categoryList = useMemo(() => {
    if (!groupedReducers) return [] as string[];
    return Object.keys(groupedReducers).sort();
  }, [groupedReducers]);

  const groupedTables = useMemo(() => {
    if (!tables.length) return null;

    // Group by prefix before first underscore; fallback to 'other'
    const groups: Record<string, { name: string }[]> = {};
    for (const t of tables) {
      const name = typeof t === 'string' ? t : (t as any).name;
      const idx = name.indexOf('_');
      // If no underscore, group by the full table name (single-word group)
      const rawGroup = idx > 0 ? name.slice(0, idx) : name;
      const group = rawGroup.trim().toLowerCase() || 'other';
      (groups[group] ||= []).push({ name });
    }
    // Sort names inside each group
    Object.values(groups).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [tables]);

  const tableGroupList = useMemo(() => {
    if (!groupedTables) return [] as string[];
    return Object.keys(groupedTables).sort();
  }, [groupedTables]);

  return (
    <div className="flex h-screen min-h-0 w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Database className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">SpacetimeDB</h1>
          <p className="text-xs text-muted-foreground">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-4">
        <nav className="flex flex-col gap-4">
          {/* Dashboard Link */}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Separator />

          {/* Tables Section */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Tables
            </div>
            {isTablesLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : tables.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No tables found</div>
            ) : groupedTables ? (
              tableGroupList.map((group) => {
                const items = groupedTables[group] || [];
                if (!items.length) return null;
                const isOpen = openTableGroups[group] ?? false;
                return (
                  <div key={group} className="">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenTableGroups((prev) => ({ ...prev, [group]: !isOpen }))
                      }
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="truncate capitalize">{group}</span>
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-1 space-y-1">
                        {items.map((item) => {
                          const isActive = pathname === `/tables/${item.name}`;
                          return (
                            <Link
                              key={item.name}
                              href={`/tables/${item.name}`}
                              className={cn(
                                'ml-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <Table className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback to flat list
              tables.map((table) => {
                const isActive = pathname === `/tables/${table.name}`;
                return (
                  <Link
                    key={table.name}
                    href={`/tables/${table.name}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Table className="h-4 w-4 shrink-0" />
                    <span className="truncate">{table.name}</span>
                  </Link>
                );
              })
            )}
          </div>

          <Separator />

          {/* Reducers Section */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Reducers
            </div>
            {isReducersLoading || isMetaLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : !reducers.length ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No reducers found</div>
            ) : groupedReducers ? (
              categoryList.map((category) => {
                const items = groupedReducers[category] || [];
                if (!items.length) return null;
                const isOpen = openCategories[category] ?? false;
                return (
                  <div key={category} className="">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCategories((prev) => ({ ...prev, [category]: !isOpen }))
                      }
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="truncate capitalize">{category}</span>
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-1 space-y-1">
                        {items.map((item) => {
                          const isActive = pathname === `/reducers/${item.name}`;
                          return (
                            <Link
                              key={item.name}
                              href={`/reducers/${item.name}`}
                              className={cn(
                                'ml-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <Zap className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback to flat list if no metadata
              reducers.map((reducer) => {
                const isActive = pathname === `/reducers/${reducer.name}`;
                return (
                  <Link
                    key={reducer.name}
                    href={`/reducers/${reducer.name}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Zap className="h-4 w-4 shrink-0" />
                    <span className="truncate">{reducer.name}</span>
                  </Link>
                );
              })
            )}
          </div>

          <Separator />

          {/* Settings Section */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Settings
            </div>
            <Link
              href="/backup"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname.startsWith('/backup')
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Download className="h-4 w-4" />
              Backup & Restore
            </Link>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </nav>
      </ScrollArea>

      {/* Footer - Connection Status */}
      <div className="border-t p-4">
        <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
          Connection Status
        </div>
        {isHealthLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Checking...</span>
          </div>
        ) : isConnected ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              <span>Connected</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {health?.tables !== undefined && (
                <div>{health.tables} {health.tables === 1 ? 'table' : 'tables'}</div>
              )}
              {reducers.length > 0 && (
                <div>{reducers.length} {reducers.length === 1 ? 'reducer' : 'reducers'}</div>
              )}
            </div>
          </div>
        ) : hasError ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>Error</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-gray-500" />
            <span>Unknown</span>
          </div>
        )}
      </div>
    </div>
  );
}
