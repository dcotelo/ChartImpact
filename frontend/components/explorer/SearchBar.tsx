'use client';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  filters: {
    changeType: string[];
    kind: string[];
    namespace: string[];
    importance: string[];
  };
  onFiltersChange: (filters: any) => void;
}

export function SearchBar({ value, onChange, filters, onFiltersChange }: SearchBarProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    }}>
      {/* Search Input */}
      <div style={{ flex: 1 }}>
        <input
          type="text"
          placeholder="🔍 Search resources, kinds, paths..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            fontSize: '0.95rem',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            outline: 'none'
          }}
        />
      </div>

      {/* Quick Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        fontSize: '0.85rem'
      }}>
        <button
          onClick={() => {
            const newFilters = { ...filters };
            if (newFilters.changeType.includes('added')) {
              newFilters.changeType = newFilters.changeType.filter(t => t !== 'added');
            } else {
              newFilters.changeType.push('added');
            }
            onFiltersChange(newFilters);
          }}
          style={{
            padding: '0.4rem 0.8rem',
            background: filters.changeType.includes('added') ? '#4caf50' : 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          + Added
        </button>
        <button
          onClick={() => {
            const newFilters = { ...filters };
            if (newFilters.changeType.includes('removed')) {
              newFilters.changeType = newFilters.changeType.filter(t => t !== 'removed');
            } else {
              newFilters.changeType.push('removed');
            }
            onFiltersChange(newFilters);
          }}
          style={{
            padding: '0.4rem 0.8rem',
            background: filters.changeType.includes('removed') ? '#f44336' : 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          - Removed
        </button>
        <button
          onClick={() => {
            const newFilters = { ...filters };
            if (newFilters.changeType.includes('modified')) {
              newFilters.changeType = newFilters.changeType.filter(t => t !== 'modified');
            } else {
              newFilters.changeType.push('modified');
            }
            onFiltersChange(newFilters);
          }}
          style={{
            padding: '0.4rem 0.8rem',
            background: filters.changeType.includes('modified') ? '#ff9800' : 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          ~ Modified
        </button>
      </div>
    </div>
  );
}
