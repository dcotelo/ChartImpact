'use client';

import { ResourceDiff } from '@/lib/types';
import { useMemo } from 'react';

interface ResourceListProps {
  resources: ResourceDiff[];
  searchQuery: string;
  filters: {
    changeType: string[];
    kind: string[];
    namespace: string[];
    importance: string[];
  };
  selectedResource: string | null;
  onSelectResource: (resourceId: string) => void;
}

export function ResourceList({
  resources,
  searchQuery,
  filters,
  selectedResource,
  onSelectResource
}: ResourceListProps) {
  // Filter and search resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      // Apply change type filter
      if (filters.changeType.length > 0 && !filters.changeType.includes(resource.changeType)) {
        return false;
      }

      // Apply kind filter
      if (filters.kind.length > 0 && !filters.kind.includes(resource.identity.kind)) {
        return false;
      }

      // Apply namespace filter
      if (filters.namespace.length > 0) {
        const ns = resource.identity.namespace || '__cluster__';
        if (!filters.namespace.includes(ns)) {
          return false;
        }
      }

      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = resource.identity.name.toLowerCase().includes(query);
        const matchesKind = resource.identity.kind.toLowerCase().includes(query);
        const matchesNamespace = (resource.identity.namespace || '').toLowerCase().includes(query);
        return matchesName || matchesKind || matchesNamespace;
      }

      return true;
    });
  }, [resources, searchQuery, filters]);

  // Group by kind
  const resourcesByKind = useMemo(() => {
    const groups: Record<string, ResourceDiff[]> = {};
    filteredResources.forEach(resource => {
      const kind = resource.identity.kind;
      if (!groups[kind]) {
        groups[kind] = [];
      }
      groups[kind].push(resource);
    });
    return groups;
  }, [filteredResources]);

  const kinds = Object.keys(resourcesByKind).sort();

  // Get change type color
  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added': return '#4caf50';
      case 'removed': return '#f44336';
      case 'modified': return '#ff9800';
      case 'unchanged': return '#9e9e9e';
      default: return '#666';
    }
  };

  // Get change type icon
  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added': return '+';
      case 'removed': return '-';
      case 'modified': return '~';
      case 'unchanged': return '=';
      default: return '•';
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{
        marginBottom: '1rem',
        fontSize: '0.9rem',
        color: '#666',
        fontWeight: '500'
      }}>
        {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
        {filteredResources.length !== resources.length && ` (of ${resources.length})`}
      </div>

      {kinds.map(kind => {
        const kindResources = resourcesByKind[kind];
        return (
          <div key={kind} style={{ marginBottom: '1.5rem' }}>
            {/* Kind Header */}
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#333',
              marginBottom: '0.5rem',
              padding: '0.25rem 0.5rem',
              background: '#e0e0e0',
              borderRadius: '4px'
            }}>
              {kind} ({kindResources.length})
            </div>

            {/* Resources */}
            {kindResources.map(resource => {
              const resourceId = `${resource.identity.kind}/${resource.identity.name}`;
              const isSelected = selectedResource === resourceId;

              return (
                <div
                  key={resourceId}
                  onClick={() => onSelectResource(resourceId)}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.25rem',
                    background: isSelected ? '#667eea' : 'white',
                    color: isSelected ? 'white' : '#333',
                    border: '1px solid',
                    borderColor: isSelected ? '#667eea' : '#ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f5f5f5';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: isSelected ? 'white' : getChangeTypeColor(resource.changeType)
                      }}
                    >
                      {getChangeTypeIcon(resource.changeType)}
                    </span>
                    <span style={{ flex: 1, fontWeight: '500' }}>
                      {resource.identity.name}
                    </span>
                  </div>
                  {resource.identity.namespace && (
                    <div style={{
                      fontSize: '0.75rem',
                      opacity: 0.8,
                      marginTop: '0.25rem',
                      marginLeft: '1.5rem'
                    }}>
                      ns: {resource.identity.namespace}
                    </div>
                  )}
                  {resource.changes && resource.changes.length > 0 && (
                    <div style={{
                      fontSize: '0.75rem',
                      opacity: 0.8,
                      marginTop: '0.25rem',
                      marginLeft: '1.5rem'
                    }}>
                      {resource.changes.length} change{resource.changes.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {filteredResources.length === 0 && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#999',
          fontSize: '0.9rem'
        }}>
          No resources match your filters or search query.
        </div>
      )}
    </div>
  );
}
