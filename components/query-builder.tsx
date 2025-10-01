/**
 * Query Builder Component
 * Schema-based SQL query builder with visual dropdowns
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Play, Plus, X, Code } from 'lucide-react';
import { toast } from 'sonner';

interface Column {
  name: string;
  type: string;
  dataType?: string;
}

interface QueryBuilderProps {
  tableName: string;
  columns: Column[];
  onExecute?: (sql: string) => void;
}

interface WhereClause {
  id: string;
  column: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: 'LIKE', label: 'Like (LIKE)' },
  { value: 'IS NULL', label: 'Is Null' },
  { value: 'IS NOT NULL', label: 'Is Not Null' },
];

export function QueryBuilder({ tableName, columns, onExecute }: QueryBuilderProps) {
  const [queryType, setQueryType] = useState<'SELECT' | 'DELETE'>('SELECT');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['*']);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [limit, setLimit] = useState('100');
  const [showSQL, setShowSQL] = useState(false);

  const addWhereClause = () => {
    const newClause: WhereClause = {
      id: Math.random().toString(36).substring(7),
      column: columns[0]?.name || '',
      operator: '=',
      value: '',
    };
    setWhereClauses([...whereClauses, newClause]);
  };

  const removeWhereClause = (id: string) => {
    setWhereClauses(whereClauses.filter(c => c.id !== id));
  };

  const updateWhereClause = (id: string, field: keyof WhereClause, value: string) => {
    setWhereClauses(whereClauses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const toggleColumn = (columnName: string) => {
    if (columnName === '*') {
      setSelectedColumns(['*']);
    } else {
      const filtered = selectedColumns.filter(c => c !== '*');
      if (filtered.includes(columnName)) {
        const newColumns = filtered.filter(c => c !== columnName);
        setSelectedColumns(newColumns.length > 0 ? newColumns : ['*']);
      } else {
        setSelectedColumns([...filtered, columnName]);
      }
    }
  };

  const buildSQL = (): string => {
    let sql = '';

    if (queryType === 'DELETE') {
      // DELETE statement
      sql = `DELETE FROM ${tableName}`;
    } else {
      // SELECT clause
      const selectClause = selectedColumns.includes('*') 
        ? '*' 
        : selectedColumns.join(', ');

      sql = `SELECT ${selectClause} FROM ${tableName}`;
    }

    // WHERE clause (common for both SELECT and DELETE)
    if (whereClauses.length > 0) {
      const validClauses = whereClauses.filter(c => {
        if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
          return true;
        }
        return c.value.trim() !== '';
      });

      if (validClauses.length > 0) {
        const whereConditions = validClauses.map(c => {
          if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
            return `${c.column} ${c.operator}`;
          }
          
          // Auto-quote string values if needed
          const columnType = columns.find(col => col.name === c.column)?.type || '';
          const needsQuotes = columnType.toLowerCase().includes('string') || 
                             columnType.toLowerCase().includes('text');
          
          const value = needsQuotes && !c.value.startsWith("'") 
            ? `'${c.value.replace(/'/g, "''")}'` 
            : c.value;

          return `${c.column} ${c.operator} ${value}`;
        });

        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    return sql;
  };

  const handleExecute = async () => {
    const sql = buildSQL();
    
    // Require WHERE clause for DELETE operations as a safety measure
    if (queryType === 'DELETE' && whereClauses.length === 0) {
      toast.error('Safety Check', {
        description: 'DELETE requires at least one WHERE condition to prevent accidental data loss.'
      });
      return;
    }
    
    try {
      if (onExecute) {
        // Execute the query through the parent component
        onExecute(sql);
      } else {
        // Fallback: copy SQL to clipboard
        await navigator.clipboard.writeText(sql);
        toast.success('SQL copied to clipboard!', { description: sql });
      }
    } catch (error) {
      toast.error('Failed to execute query');
    }
  };

  const generatedSQL = buildSQL();

  return (
    <div className="space-y-6">
      {/* Query Type Selector */}
      <div className="space-y-2">
        <Label>Query Type</Label>
        <Select value={queryType} onValueChange={(value: 'SELECT' | 'DELETE') => setQueryType(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SELECT">SELECT (Read Data)</SelectItem>
            <SelectItem value="DELETE">DELETE (Remove Data)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* SELECT Columns - Only show for SELECT queries */}
      {queryType === 'SELECT' && (
        <div className="space-y-2">
          <Label>Select Columns</Label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedColumns.includes('*') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleColumn('*')}
            >
              * (All)
            </Badge>
            {columns.map((col) => (
              <Badge
                key={col.name}
                variant={selectedColumns.includes(col.name) && !selectedColumns.includes('*') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleColumn(col.name)}
              >
                {col.name}
                <span className="ml-1 text-xs opacity-70">({col.type})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* WHERE Clauses */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>WHERE Conditions</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWhereClause}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Condition
          </Button>
        </div>

        {whereClauses.length > 0 && (
          <div className="space-y-2">
            {whereClauses.map((clause, index) => (
              <Card key={clause.id} className="p-3">
                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Badge variant="secondary" className="shrink-0">AND</Badge>
                  )}
                  
                  <Select
                    value={clause.column}
                    onValueChange={(value) => updateWhereClause(clause.id, 'column', value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name} <span className="text-xs opacity-70">({col.type})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={clause.operator}
                    onValueChange={(value) => updateWhereClause(clause.id, 'operator', value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {clause.operator !== 'IS NULL' && clause.operator !== 'IS NOT NULL' && (
                    <Input
                      value={clause.value}
                      onChange={(e) => updateWhereClause(clause.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWhereClause(clause.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Generated SQL Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Generated SQL</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSQL(!showSQL)}
          >
            <Code className="mr-2 h-4 w-4" />
            {showSQL ? 'Hide' : 'Show'} SQL
          </Button>
        </div>

        {showSQL && (
          <Card className="bg-muted p-4">
            <code className="text-sm font-mono">{generatedSQL}</code>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          onClick={handleExecute} 
          className="flex-1"
          variant={queryType === 'DELETE' ? 'destructive' : 'default'}
        >
          <Play className="mr-2 h-4 w-4" />
          Execute {queryType}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setQueryType('SELECT');
            setSelectedColumns(['*']);
            setWhereClauses([]);
            setLimit('100');
          }}
        >
          Reset
        </Button>
      </div>

      {/* Info Note */}
      {queryType === 'SELECT' ? (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> SpacetimeDB SQL doesn't support LIMIT/OFFSET. 
          Results are limited by the maximum fetch size ({limit} rows default).
        </div>
      ) : (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-200">
          <strong>Warning:</strong> DELETE operations are permanent and cannot be undone. 
          You must specify WHERE conditions to prevent deleting all data.
        </div>
      )}
    </div>
  );
}
