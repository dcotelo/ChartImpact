'use client';

import { DiffResultV2, ResourceDiffV2 } from '@/lib/types';
import { COLORS, getChangeTypeColor, getChangeTypeIcon } from './utils';

interface StatisticsDashboardProps {
  diffData: DiffResultV2;
}

interface StatCard {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface KindStats {
  kind: string;
  added: number;
  removed: number;
  modified: number;
  total: number;
}

/**
 * Compute statistics from the diff data
 */
function computeStatistics(diffData: DiffResultV2) {
  const resources = diffData.resources || [];
  
  // Basic counts
  const added = resources.filter(r => r.changeType === 'added').length;
  const removed = resources.filter(r => r.changeType === 'removed').length;
  const modified = resources.filter(r => r.changeType === 'modified').length;
  const total = resources.length;
  
  // Change breakdown
  let specChanges = 0;
  let metadataOnlyChanges = 0;
  let impactfulChanges = 0;
  let lowRiskChanges = 0;
  
  resources.forEach(resource => {
    if (resource.changeType === 'modified' && resource.changes) {
      let hasSpecChange = false;
      let hasMetadataOnlyChange = false;
      let hasImportantChange = false;
      
      resource.changes.forEach(change => {
        const path = change.path;
        
        // Check if change is in spec (must start with /spec/ or be exactly spec)
        if (path === 'spec' || path === '/spec' || path.startsWith('spec.') || path.startsWith('spec/') || path.startsWith('/spec.') || path.startsWith('/spec/')) {
          hasSpecChange = true;
        }
        
        // Check importance
        if (change.importance === 'high' || change.importance === 'critical') {
          hasImportantChange = true;
        }
      });
      
      // After checking all changes in this resource, determine if it's metadata-only
      // A resource is metadata-only if it has changes but no spec changes
      if (!hasSpecChange && resource.changes.length > 0) {
        // Check if any change is in metadata path
        const hasMetadata = resource.changes.some(change => {
          const path = change.path;
          return path === 'metadata' || path === '/metadata' || 
                 path.startsWith('metadata.') || path.startsWith('metadata/') || 
                 path.startsWith('/metadata.') || path.startsWith('/metadata/');
        });
        if (hasMetadata) {
          hasMetadataOnlyChange = true;
        }
      }
      
      if (hasSpecChange) specChanges++;
      if (hasMetadataOnlyChange) metadataOnlyChanges++;
      if (hasImportantChange) {
        impactfulChanges++;
      } else {
        lowRiskChanges++;
      }
    }
  });
  
  // Top changed resource kinds
  const kindMap: Record<string, KindStats> = {};
  resources.forEach(resource => {
    const kind = resource.identity.kind;
    if (!kindMap[kind]) {
      kindMap[kind] = { kind, added: 0, removed: 0, modified: 0, total: 0 };
    }
    kindMap[kind].total++;
    if (resource.changeType === 'added') kindMap[kind].added++;
    if (resource.changeType === 'removed') kindMap[kind].removed++;
    if (resource.changeType === 'modified') kindMap[kind].modified++;
  });
  
  const topKinds = Object.values(kindMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  return {
    added,
    removed,
    modified,
    total,
    specChanges,
    metadataOnlyChanges,
    impactfulChanges,
    lowRiskChanges,
    topKinds,
  };
}

/**
 * StatisticsDashboard - Enhanced statistics overview of diff results
 */
export function StatisticsDashboard({ diffData }: StatisticsDashboardProps) {
  const stats = computeStatistics(diffData);
  
  // Main stat cards
  const statCards: StatCard[] = [
    {
      label: 'Added',
      value: stats.added,
      color: COLORS.added,
      icon: getChangeTypeIcon('added'),
    },
    {
      label: 'Removed',
      value: stats.removed,
      color: COLORS.removed,
      icon: getChangeTypeIcon('removed'),
    },
    {
      label: 'Modified',
      value: stats.modified,
      color: COLORS.modified,
      icon: getChangeTypeIcon('modified'),
    },
    {
      label: 'Total Resources',
      value: stats.total,
      color: COLORS.primary,
      icon: '📦',
    },
  ];
  
  return (
    <div style={{
      padding: '1rem 2rem',
      background: COLORS.bgLighter,
      borderBottom: `1px solid ${COLORS.border}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{
          fontSize: '1.1rem',
          margin: 0,
          color: COLORS.text,
          fontWeight: '600',
        }}>
          📊 Statistics Dashboard
        </h3>
        <div style={{
          fontSize: '0.8rem',
          color: COLORS.textLight,
        }}>
          Overview of changes detected
        </div>
      </div>
      
      {/* Main Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}>
        {statCards.map(card => (
          <div
            key={card.label}
            style={{
              padding: '1rem',
              background: COLORS.bgLight,
              border: `2px solid ${card.color}`,
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: card.color,
              marginBottom: '0.25rem',
            }}>
              {card.icon} {card.value}
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: COLORS.textLight,
              fontWeight: '500',
            }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>
      
      {/* Secondary Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}>
        {/* Change Breakdown */}
        <div style={{
          padding: '0.75rem',
          background: COLORS.bgLight,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            color: COLORS.textLighter,
            fontWeight: '600',
            marginBottom: '0.5rem',
          }}>
            Change Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: COLORS.text }}>Spec Changes</span>
              <span style={{
                padding: '0.25rem 0.5rem',
                background: COLORS.modifiedBg,
                color: COLORS.modifiedText,
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}>
                {stats.specChanges}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: COLORS.text }}>Metadata Only</span>
              <span style={{
                padding: '0.25rem 0.5rem',
                background: COLORS.bgLightest,
                color: COLORS.textLight,
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}>
                {stats.metadataOnlyChanges}
              </span>
            </div>
          </div>
        </div>
        
        {/* High-level Indicators */}
        <div style={{
          padding: '0.75rem',
          background: COLORS.bgLight,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            color: COLORS.textLighter,
            fontWeight: '600',
            marginBottom: '0.5rem',
          }}>
            Impact Indicators
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: COLORS.text }}>Impactful Changes</span>
              <span style={{
                padding: '0.25rem 0.5rem',
                background: stats.impactfulChanges > 0 ? COLORS.high : COLORS.bgLightest,
                color: stats.impactfulChanges > 0 ? COLORS.white : COLORS.textLight,
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}>
                {stats.impactfulChanges}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: COLORS.text }}>Low Risk</span>
              <span style={{
                padding: '0.25rem 0.5rem',
                background: COLORS.bgLightest,
                color: COLORS.textLight,
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}>
                {stats.lowRiskChanges}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Top Changed Resource Kinds */}
      {stats.topKinds.length > 0 && (
        <div style={{
          padding: '0.75rem',
          background: COLORS.bgLight,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            color: COLORS.textLighter,
            fontWeight: '600',
            marginBottom: '0.5rem',
          }}>
            Top Changed Resource Kinds
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.5rem',
          }}>
            {stats.topKinds.map(kind => (
              <div
                key={kind.kind}
                style={{
                  padding: '0.75rem',
                  background: COLORS.bgLightest,
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderLight}`,
                }}
              >
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: COLORS.text,
                  marginBottom: '0.5rem',
                }}>
                  {kind.kind}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                }}>
                  {kind.added > 0 && (
                    <span style={{ color: COLORS.addedText }}>
                      +{kind.added}
                    </span>
                  )}
                  {kind.removed > 0 && (
                    <span style={{ color: COLORS.removedText }}>
                      -{kind.removed}
                    </span>
                  )}
                  {kind.modified > 0 && (
                    <span style={{ color: COLORS.modifiedText }}>
                      ~{kind.modified}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Assessment */}
      <div style={{
        marginTop: '0.75rem',
        padding: '0.5rem 0.75rem',
        background: stats.impactfulChanges > 0 ? 'rgba(255, 152, 0, 0.15)' : 'rgba(76, 175, 80, 0.15)',
        border: `1px solid ${stats.impactfulChanges > 0 ? COLORS.high : COLORS.low}`,
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: COLORS.text,
      }}>
        <strong>Quick Assessment:</strong>{' '}
        {stats.impactfulChanges > 0 
          ? `This comparison contains ${stats.impactfulChanges} impactful change${stats.impactfulChanges > 1 ? 's' : ''} that should be reviewed carefully.`
          : stats.modified > 0
          ? 'This appears to be a moderate change. Review the modifications for any unexpected changes.'
          : stats.added > 0 || stats.removed > 0
          ? 'Resources were added or removed. Verify this matches your expectations.'
          : 'No changes detected between versions.'}
      </div>
    </div>
  );
}
