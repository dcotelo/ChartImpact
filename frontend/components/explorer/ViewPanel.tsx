'use client';

import { ResourceDiff, Change } from '@/lib/types';
import { useMemo } from 'react';
import {
  getChangeTypeColor,
  getChangeTypeBackground,
  getChangeTypeTextColor,
  getResourceId,
  filterResources,
  EmptyState,
  ViewModeButton,
  COLORS,
  STYLES,
} from './utils';

interface ViewPanelProps {
  resources: ResourceDiff[];
  searchQuery: string;
  filters: {
    changeType: string[];
    kind: string[];
    namespace: string[];
    importance: string[];
  };
  viewMode: 'tree' | 'table' | 'sidebyside';
  onViewModeChange: (mode: 'tree' | 'table' | 'sidebyside') => void;
  selectedResource: string | null;
}

export function ViewPanel({
  resources,
  searchQuery,
  filters,
  viewMode,
  onViewModeChange,
  selectedResource
}: ViewPanelProps) {
  // Filter resources
  const filteredResources = useMemo(() => {
    return filterResources(resources, filters, searchQuery);
  }, [resources, searchQuery, filters]);

  // If a resource is selected, show only that one
  const displayResources = useMemo(() => {
    if (selectedResource) {
      return filteredResources.filter(
        r => `${r.identity.kind}/${r.identity.name}` === selectedResource
      );
    }
    return filteredResources;
  }, [filteredResources, selectedResource]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Selector */}
      <div style={{
        padding: '1rem',
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.bgLighter,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ViewModeButton
            label="Tree"
            icon="🌳"
            isActive={viewMode === 'tree'}
            onClick={() => onViewModeChange('tree')}
          />
          <ViewModeButton
            label="Table"
            icon="📊"
            isActive={viewMode === 'table'}
            onClick={() => onViewModeChange('table')}
          />
          <ViewModeButton
            label="Side-by-side"
            icon="↔️"
            isActive={viewMode === 'sidebyside'}
            onClick={() => onViewModeChange('sidebyside')}
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: COLORS.textLight }}>
          {displayResources.length} resource{displayResources.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* View Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {viewMode === 'tree' && <TreeView resources={displayResources} />}
        {viewMode === 'table' && <TableView resources={displayResources} />}
        {viewMode === 'sidebyside' && <SideBySideView resources={displayResources} />}
      </div>
    </div>
  );
}

// Tree View Component
function TreeView({ resources }: { resources: ResourceDiff[] }) {
  return (
    <div>
      {resources.map((resource) => {
        const resourceId = getResourceId(resource);
        return (
          <div key={resourceId} style={STYLES.card}>
          {/* Resource Header */}
          <div style={{
            ...STYLES.cardHeader,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                {resource.identity.kind} / {resource.identity.name}
              </span>
              {resource.identity.namespace && (
                <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: COLORS.textLight }}>
                  ns: {resource.identity.namespace}
                </span>
              )}
            </div>
            <div>
              <span style={STYLES.badge(getChangeTypeColor(resource.changeType))}>
                {resource.changeType}
              </span>
            </div>
          </div>

          {/* Changes */}
          {resource.changes && resource.changes.length > 0 && (
            <div style={{ padding: '1rem' }}>
              {resource.changes.map((change) => (
                <div
                  key={`${change.path}-${change.type}`}
                  style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: COLORS.bgLightest,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: '4px'
                  }}
                >
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: COLORS.text,
                    marginBottom: '0.5rem',
                    fontFamily: 'monospace'
                  }}>
                    {change.path}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                    {change.before !== undefined && (
                      <div style={{ flex: 1 }}>
                        <div style={{ color: COLORS.textLighter, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Before:
                        </div>
                        <div style={{
                          background: COLORS.removedBg,
                          padding: '0.5rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: COLORS.removedText
                        }}>
                          {JSON.stringify(change.before, null, 2)}
                        </div>
                      </div>
                    )}
                    {change.after !== undefined && (
                      <div style={{ flex: 1 }}>
                        <div style={{ color: COLORS.textLighter, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          After:
                        </div>
                        <div style={{
                          background: COLORS.addedBg,
                          padding: '0.5rem',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: COLORS.addedText
                        }}>
                          {JSON.stringify(change.after, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                  {change.importance && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: COLORS.textLight
                    }}>
                      Importance: <strong>{change.importance}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}

      {resources.length === 0 && <EmptyState />}
    </div>
  );
}

// Table View Component
function TableView({ resources }: { resources: ResourceDiff[] }) {
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem'
      }}>
        <thead>
          <tr style={{ background: COLORS.bgLight }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
              Kind
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
              Name
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
              Namespace
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
              Change Type
            </th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${COLORS.border}` }}>
              Changes
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => {
            const resourceId = getResourceId(resource);
            return (
              <tr
                key={resourceId}
              style={{
                borderBottom: `1px solid ${COLORS.borderLight}`,
                background: resourceId.split('/')[2] === 'cluster' ? COLORS.white : COLORS.bgLightest
              }}
            >
              <td style={{ padding: '0.75rem' }}>{resource.identity.kind}</td>
              <td style={{ padding: '0.75rem', fontWeight: '500' }}>{resource.identity.name}</td>
              <td style={{ padding: '0.75rem' }}>{resource.identity.namespace || '-'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: getChangeTypeBackground(resource.changeType),
                    color: getChangeTypeTextColor(resource.changeType),
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  {resource.changeType}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                {resource.changes ? resource.changes.length : 0}
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>

      {resources.length === 0 && <EmptyState />}
    </div>
  );
}

// Side-by-side View Component
function SideBySideView({ resources }: { resources: ResourceDiff[] }) {
  return (
    <div>
      {resources.map((resource) => {
        const resourceId = getResourceId(resource);
        return (
          <div key={resourceId} style={STYLES.card}>
          <div style={STYLES.cardHeader}>
            {resource.identity.kind} / {resource.identity.name}
          </div>

          <div style={{ display: 'flex' }}>
            {/* Before (Left) */}
            <div style={{
              flex: 1,
              padding: '1rem',
              borderRight: `1px solid ${COLORS.border}`,
              background: COLORS.removedBg
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: COLORS.removedText
              }}>
                Before
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: COLORS.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {resource.changes && resource.changes.length > 0
                  ? resource.changes.map(c => `${c.path}: ${JSON.stringify(c.before, null, 2)}`).join('\n\n')
                  : 'No changes'}
              </pre>
            </div>

            {/* After (Right) */}
            <div style={{
              flex: 1,
              padding: '1rem',
              background: COLORS.addedBg
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: COLORS.addedText
              }}>
                After
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: COLORS.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {resource.changes && resource.changes.length > 0
                  ? resource.changes.map(c => `${c.path}: ${JSON.stringify(c.after, null, 2)}`).join('\n\n')
                  : 'No changes'}
              </pre>
            </div>
          </div>
        </div>
      );
    })}

      {resources.length === 0 && <EmptyState />}
    </div>
  );
}
