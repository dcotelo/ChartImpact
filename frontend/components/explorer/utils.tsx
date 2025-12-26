import { ResourceDiff } from '@/lib/types';

/**
 * Get color for change type badge
 */
export function getChangeTypeColor(changeType: string): string {
  switch (changeType) {
    case 'added': return '#4caf50';
    case 'removed': return '#f44336';
    case 'modified': return '#ff9800';
    case 'unchanged': return '#9e9e9e';
    default: return '#666';
  }
}

/**
 * Get icon for change type
 */
export function getChangeTypeIcon(changeType: string): string {
  switch (changeType) {
    case 'added': return '+';
    case 'removed': return '-';
    case 'modified': return '~';
    case 'unchanged': return '=';
    default: return '•';
  }
}

/**
 * Get color for importance level
 */
export function getImportanceColor(importance?: string): string {
  switch (importance) {
    case 'critical': return '#d32f2f';
    case 'high': return '#f57c00';
    case 'medium': return '#fbc02d';
    case 'low': return '#388e3c';
    default: return '#757575';
  }
}

/**
 * Generate unique resource identifier
 */
export function getResourceId(resource: ResourceDiff): string {
  return `${resource.identity.kind}/${resource.identity.name}/${resource.identity.namespace || 'cluster'}`;
}

/**
 * Get background color for change type (lighter shade for tables/cards)
 */
export function getChangeTypeBackground(changeType: string): string {
  switch (changeType) {
    case 'added': return '#e8f5e9';
    case 'removed': return '#ffebee';
    case 'modified': return '#fff3e0';
    case 'unchanged': return '#f5f5f5';
    default: return '#f5f5f5';
  }
}

/**
 * Get text color for change type (for use on light backgrounds)
 */
export function getChangeTypeTextColor(changeType: string): string {
  switch (changeType) {
    case 'added': return '#2e7d32';
    case 'removed': return '#c62828';
    case 'modified': return '#e65100';
    case 'unchanged': return '#666';
    default: return '#666';
  }
}

/**
 * Filter resources based on filters and search query
 */
export function filterResources(
  resources: ResourceDiff[],
  filters: {
    changeType: string[];
    kind: string[];
    namespace: string[];
    importance: string[];
  },
  searchQuery: string
): ResourceDiff[] {
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
}

/**
 * Render empty state component
 */
export function EmptyState({ message = 'No resources to display' }: { message?: string }) {
  return (
    <div style={{
      padding: '3rem',
      textAlign: 'center',
      color: '#999'
    }}>
      {message}
    </div>
  );
}
