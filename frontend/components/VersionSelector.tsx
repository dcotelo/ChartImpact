import React from 'react';

interface VersionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  versions: string[];
  loadingVersions: boolean;
  versionsError: string | null;
  label: string;
  required?: boolean;
}

export function VersionSelector({
  value,
  onChange,
  versions,
  loadingVersions,
  versionsError,
  label,
  required = true,
}: VersionSelectorProps) {
  return (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '600',
        color: '#333'
      }}>
        {label} {required && '*'}
      </label>
      <div style={{ position: 'relative' }}>
        {loadingVersions ? (
          <div style={{
            position: 'relative',
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
            backgroundColor: '#f5f5f5',
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'not-allowed'
          }}>
            <span style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid #e0e0e0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0
            }}></span>
            <span>Loading versions...</span>
          </div>
        ) : versions.length > 0 ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              backgroundColor: '#fff',
              color: '#333',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              paddingRight: '2.5rem'
            }}
          >
            <option value="">Select a version...</option>
            {versions.map((version, idx) => (
              <option key={`${label}-${idx}-${version}`} value={version}>
                {version}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter version manually"
            required={required}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '1rem',
              backgroundColor: '#fff'
            }}
          />
        )}
      </div>
      {versionsError && (
        <small style={{ color: '#d32f2f', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
          {versionsError}
        </small>
      )}
      {versions.length > 0 && !versionsError && !loadingVersions && (
        <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
          {versions.length} version{versions.length !== 1 ? 's' : ''} available
        </small>
      )}
    </div>
  );
}
