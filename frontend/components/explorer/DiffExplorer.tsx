'use client';

import { useState } from 'react';
import { CompareResponse, DiffResultV2 } from '@/lib/types';
import { ResourceList } from './ResourceList';
import { ViewPanel } from './ViewPanel';
import { DetailsPanel } from './DetailsPanel';
import { SearchBar } from './SearchBar';

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

  // Use structured diff from result if diffData prop is not provided
  const effectiveDiffData = diffData || result.structuredDiff;
  const isDemoMode = diffData !== undefined && diffData !== result.structuredDiff;

  // Check if we have v2 data structure available
  if (!effectiveDiffData || !effectiveDiffData.resources) {
    return (
      <div style={{
        padding: '2rem',
        background: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Diff Explorer (v2)</h3>
        <p style={{ color: '#666' }}>
          The new structured diff format is not yet available from the backend.
          <br />
          Please use the Classic view for now.
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
