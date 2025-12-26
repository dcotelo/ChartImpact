'use client';

import { useState, useMemo } from 'react';
import { CompareResponse, DiffResultV2 } from '@/lib/types';
import { ResourceList } from './ResourceList';
import { ViewPanel } from './ViewPanel';
import { DetailsPanel } from './DetailsPanel';
import { SearchBar } from './SearchBar';
import { convertPlainDiffToV2 } from './diffConverter';

interface DiffExplorerProps {
  result: CompareResponse;
  diffData?: DiffResultV2;
}

export function DiffExplorer({ result, diffData }: DiffExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'table' | 'sidebyside'>('tree');
  const [filters, setFilters] = useState({
    changeType: [] as string[],
    kind: [] as string[],
    namespace: [] as string[],
    importance: [] as string[],
  });

  // Try multiple sources for diff data:
  // 1. Explicit diffData prop (demo mode)
  // 2. Structured diff from backend
  // 3. Convert plain text diff to structured format
  const effectiveDiffData = useMemo(() => {
    if (diffData) {
      return diffData;
    }
    
    if (result.structuredDiff) {
      return result.structuredDiff;
    }
    
    // Fallback: try to convert plain text diff
    if (result.diff) {
      const converted = convertPlainDiffToV2(result.diff, result.version1, result.version2);
      return converted;
    }
    
    return null;
  }, [diffData, result.structuredDiff, result.diff, result.version1, result.version2]);

  const isDemoMode = diffData !== undefined && diffData !== result.structuredDiff;
  const isConvertedMode = !diffData && !result.structuredDiff && result.diff && effectiveDiffData;

  // Only block if we have NO data at all
  if (!effectiveDiffData) {
    return (
      <div style={{
        padding: '2rem',
        background: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Diff Explorer (v2)</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          No comparison data available.
          <br />
          Please run a comparison first.
        </p>
      </div>
    );
  }

  // Handle case where structured diff exists but has no resources
  if (!effectiveDiffData.resources || effectiveDiffData.resources.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        background: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Diff Explorer (v2)</h3>
        <p style={{ color: '#666' }}>
          No resource changes detected between the two versions.
          <br />
          The versions appear to be identical.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#fff'
    }}>
      {/* Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        borderBottom: '2px solid #555'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
              🔍 Diff Explorer (v2)
            </h2>
            {isDemoMode && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                DEMO MODE
              </span>
            )}
            {isConvertedMode && (
              <span style={{
                background: 'rgba(255, 200, 100, 0.3)',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#fff'
              }}>
                ADAPTED FROM PLAIN DIFF
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
            <span style={{ marginRight: '1rem' }}>
              <strong>v1:</strong> {result.version1}
            </span>
            <span>
              <strong>v2:</strong> {result.version2}
            </span>
          </div>
        </div>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Left Rail - Resource List */}
        <div style={{
          width: '300px',
          borderRight: '1px solid #ddd',
          overflow: 'auto',
          background: '#f9f9f9'
        }}>
          <ResourceList
            resources={effectiveDiffData.resources}
            searchQuery={searchQuery}
            filters={filters}
            selectedResource={selectedResource}
            onSelectResource={setSelectedResource}
          />
        </div>

        {/* Main Panel - View */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#fff'
        }}>
          <ViewPanel
            resources={effectiveDiffData.resources}
            searchQuery={searchQuery}
            filters={filters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedResource={selectedResource}
          />
        </div>

        {/* Right Panel - Details */}
        {selectedResource && effectiveDiffData && effectiveDiffData.resources && (
          <div style={{
            width: '350px',
            borderLeft: '1px solid #ddd',
            overflow: 'auto',
            background: '#f9f9f9'
          }}>
            <DetailsPanel
              resource={effectiveDiffData.resources.find(
                r => r?.identity && `${r.identity.kind}/${r.identity.name}` === selectedResource
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
