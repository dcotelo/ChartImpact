import { ResourceDiff } from '@/lib/types';

/**
 * Common style constants
 */
export const COLORS = {
  // Change type colors
  added: '#4caf50',
  removed: '#f44336',
  modified: '#ff9800',
  unchanged: '#9e9e9e',
  
  // Background colors
  addedBg: '#e8f5e9',
  removedBg: '#ffebee',
  modifiedBg: '#fff3e0',
  unchangedBg: '#f5f5f5',
  
  // Text colors
  addedText: '#2e7d32',
  removedText: '#c62828',
  modifiedText: '#e65100',
  unchangedText: '#666',
  
  // Importance colors
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c',
  defaultImportance: '#757575',
  
  // UI colors
  primary: '#667eea',
  text: '#333',
  textLight: '#666',
  textLighter: '#999',
  border: '#ddd',
  borderLight: '#e0e0e0',
  bgLight: '#f5f5f5',
  bgLighter: '#f9f9f9',
  bgLightest: '#fafafa',
  white: 'white',
} as const;

/**
 * Common style objects
 */
export const STYLES = {
  button: (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    background: isActive ? COLORS.primary : COLORS.white,
    color: isActive ? COLORS.white : COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500' as const,
  }),
  
  card: {
    marginBottom: '1.5rem',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    overflow: 'hidden' as const,
  },
  
  cardHeader: {
    padding: '0.75rem 1rem',
    background: COLORS.bgLight,
    borderBottom: `1px solid ${COLORS.border}`,
    fontWeight: '600' as const,
  },
  
  badge: (color: string) => ({
    padding: '0.25rem 0.75rem',
    background: color,
    color: COLORS.white,
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  }),
  
  input: {
    width: '100%',
    padding: '0.5rem 1rem',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    outline: 'none' as const,
  },
  
  sectionHeader: {
    fontSize: '0.8rem',
    fontWeight: '600' as const,
    color: COLORS.textLighter,
    textTransform: 'uppercase' as const,
    marginBottom: '0.5rem',
  },
} as const;

/**
 * Get color for change type badge
 */
export function getChangeTypeColor(changeType: string): string {
  switch (changeType) {
    case 'added': return COLORS.added;
    case 'removed': return COLORS.removed;
    case 'modified': return COLORS.modified;
    case 'unchanged': return COLORS.unchanged;
    default: return COLORS.textLight;
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
    case 'critical': return COLORS.critical;
    case 'high': return COLORS.high;
    case 'medium': return COLORS.medium;
    case 'low': return COLORS.low;
    default: return COLORS.defaultImportance;
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
    case 'added': return COLORS.addedBg;
    case 'removed': return COLORS.removedBg;
    case 'modified': return COLORS.modifiedBg;
    case 'unchanged': return COLORS.unchangedBg;
    default: return COLORS.bgLight;
  }
}

/**
 * Get text color for change type (for use on light backgrounds)
 */
export function getChangeTypeTextColor(changeType: string): string {
  switch (changeType) {
    case 'added': return COLORS.addedText;
    case 'removed': return COLORS.removedText;
    case 'modified': return COLORS.modifiedText;
    case 'unchanged': return COLORS.unchangedText;
    default: return COLORS.textLight;
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
      color: COLORS.textLighter
    }}>
      {message}
    </div>
  );
}

/**
 * Reusable button component for view mode selection
 */
interface ViewModeButtonProps {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

export function ViewModeButton({ label, icon, isActive, onClick }: ViewModeButtonProps) {
  return (
    <button
      onClick={onClick}
      style={STYLES.button(isActive)}
    >
      {icon} {label}
    </button>
  );
}
