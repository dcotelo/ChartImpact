import { ResourceDiff } from '@/lib/types';

/**
 * Common style constants - Dark theme to match Classic view
 */
export const COLORS = {
  // Change type colors (keep semantic colors consistent)
  added: '#4caf50',
  removed: '#f44336',
  modified: '#ff9800',
  unchanged: '#9e9e9e',
  
  // Background colors - Dark theme
  addedBg: '#1e4620',
  removedBg: '#4a1a1a',
  modifiedBg: '#4a3510',
  unchangedBg: '#2d2d2d',
  
  // Text colors - Light on dark
  addedText: '#81c784',
  removedText: '#e57373',
  modifiedText: '#ffb74d',
  unchangedText: '#999',
  
  // Importance colors
  critical: '#f44336',
  high: '#ff9800',
  medium: '#fbc02d',
  low: '#4caf50',
  defaultImportance: '#999',
  
  // UI colors - Dark theme
  primary: '#4caf50',
  text: '#d4d4d4',
  textLight: '#999',
  textLighter: '#666',
  border: '#444',
  borderLight: '#333',
  bgLight: '#2d2d2d',
  bgLighter: '#252525',
  bgLightest: '#1e1e1e',
  white: '#1e1e1e',
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
 * Common code box style
 */
export const CODE_BOX_STYLE = {
  margin: 0,
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  color: COLORS.text,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
};

/**
 * Label style for before/after
 */
export const LABEL_STYLE = {
  color: COLORS.textLighter,
  fontSize: '0.75rem',
  marginBottom: '0.25rem',
};

/**
 * Code display box style generator
 */
export function getCodeBoxStyle(background: string, textColor: string) {
  return {
    background,
    padding: '0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: textColor,
  };
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

/**
 * Component for displaying before/after value comparison
 */
interface ValueComparisonProps {
  before?: any;
  after?: any;
}

export function ValueComparison({ before, after }: ValueComparisonProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
      {before !== undefined && (
        <div style={{ flex: 1 }}>
          <div style={LABEL_STYLE}>Before:</div>
          <div style={getCodeBoxStyle(COLORS.removedBg, COLORS.removedText)}>
            {JSON.stringify(before, null, 2)}
          </div>
        </div>
      )}
      {after !== undefined && (
        <div style={{ flex: 1 }}>
          <div style={LABEL_STYLE}>After:</div>
          <div style={getCodeBoxStyle(COLORS.addedBg, COLORS.addedText)}>
            {JSON.stringify(after, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
