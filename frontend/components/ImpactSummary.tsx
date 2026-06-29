/**
 * Impact Summary Component
 * 
 * Displays risk-first summary of Helm chart changes with availability and security sections.
 * Part of Phase 4: Impact Summary (Core Feature)
 * 
 * Based on: ux-revamp/IMPLEMENTATION_ROADMAP.md Phase 4.2
 */

'use client';

import { useState } from 'react';
import { ImpactSummary, RiskSignal } from '@/lib/types';
import {
  SPACING,
  SEMANTIC_COLORS,
  BORDER_RADIUS,
  getRiskColors,
  getRiskLabel,
  FONT_WEIGHTS
} from '@/lib/design-tokens';
import { generateImpactStatement } from '@/lib/risk-assessment';

interface ImpactSummaryProps {
  summary: ImpactSummary;
  onViewExplorer?: () => void;
  onSelectResource?: (resourceId: string) => void;
}

export function ImpactSummaryComponent({ summary, onViewExplorer, onSelectResource }: ImpactSummaryProps) {
  const impactStatement = generateImpactStatement(summary);

  // Verdict styling
  const verdictConfig = {
    'high-risk': {
      color: getRiskColors('high').text,
      bg: getRiskColors('high').bg,
      border: getRiskColors('high').border,
      icon: '⚠️',
      message: 'Review before deploying',
      description: 'This upgrade contains high-risk changes affecting availability or security.',
    },
    'medium-risk': {
      color: getRiskColors('medium').text,
      bg: getRiskColors('medium').bg,
      border: getRiskColors('medium').border,
      icon: '⚡',
      message: 'Consider reviewing',
      description: 'This upgrade contains changes that may affect your deployment.',
    },
    'low-risk': {
      color: getRiskColors('low').text,
      bg: getRiskColors('low').bg,
      border: getRiskColors('low').border,
      icon: '✓',
      message: 'Low risk upgrade',
      description: `This upgrade contains ${summary.totalChangedResources} change${summary.totalChangedResources !== 1 ? 's' : ''}, all low-risk. ${summary.totalLowRisk > 0 ? `${summary.totalLowRisk} flagged for minor review.` : 'No significant impacts detected.'}`,
    },
    'no-changes': {
      color: SEMANTIC_COLORS.success,
      bg: SEMANTIC_COLORS.successBg,
      border: SEMANTIC_COLORS.successBg,
      icon: '✓',
      message: 'No changes detected',
      description: 'The two versions are identical. No differences found in the rendered Helm templates.',
    },
  };

  const verdict = verdictConfig[summary.verdict];

  return (
    <div style={{ marginTop: SPACING.xl }}>
      {/* Verdict Banner */}
      <div style={{
        padding: SPACING.lg,
        background: verdict.bg,
        border: `2px solid ${verdict.border}`,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xl,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: SPACING.md,
          marginBottom: SPACING.sm,
        }}>
          <span style={{ fontSize: '2.25rem', lineHeight: 1, paddingTop: '2px' }}>{verdict.icon}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.75rem',
              color: verdict.color,
              fontWeight: FONT_WEIGHTS.bold,
              letterSpacing: '-0.02em',
            }}>
              {verdict.message}
            </h2>
            {impactStatement && (
              <p style={{
                margin: 0,
                marginTop: SPACING.sm,
                color: SEMANTIC_COLORS.textPrimary,
                fontSize: '1.05rem',
                fontWeight: FONT_WEIGHTS.medium,
                lineHeight: '1.5',
              }}>
                {impactStatement}
              </p>
            )}
            <p style={{
              margin: 0,
              marginTop: impactStatement ? SPACING.xs : SPACING.xs,
              color: SEMANTIC_COLORS.textSecondary,
              fontSize: '0.9rem',
            }}>
              {verdict.description}
            </p>
          </div>
        </div>
        
        {/* Risk Counts */}
        {summary.totalHighRisk + summary.totalMediumRisk + summary.totalLowRisk > 0 && (
          <div style={{
            display: 'flex',
            gap: SPACING.lg,
            marginTop: SPACING.md,
            fontSize: '0.9rem',
            color: SEMANTIC_COLORS.textPrimary, // Ensure good contrast on light backgrounds
          }}>
            {summary.totalHighRisk > 0 && (
              <div>
                <span style={{ marginRight: SPACING.xs }}>{getRiskColors('high').icon}</span>
                <strong>{summary.totalHighRisk}</strong> high risk
              </div>
            )}
            {summary.totalMediumRisk > 0 && (
              <div>
                <span style={{ marginRight: SPACING.xs }}>{getRiskColors('medium').icon}</span>
                <strong>{summary.totalMediumRisk}</strong> medium risk
              </div>
            )}
            {summary.totalLowRisk > 0 && (
              <div>
                <span style={{ marginRight: SPACING.xs }}>{getRiskColors('low').icon}</span>
                <strong>{summary.totalLowRisk}</strong> low risk
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Impact Section */}
      {summary.availabilityImpact.length > 0 && (
        <Section
          title="⚡ Availability Impact"
          signals={summary.availabilityImpact}
          defaultExpanded={true}
          onSelectResource={onSelectResource}
        />
      )}

      {/* Security Impact Section */}
      {summary.securityImpact.length > 0 && (
        <Section
          title="🔐 Security Impact"
          signals={summary.securityImpact}
          defaultExpanded={true}
          onSelectResource={onSelectResource}
        />
      )}

      {/* Other Changes Section */}
      {summary.otherChanges.length > 0 && (
        <Section
          title="📝 Other Changes"
          signals={summary.otherChanges}
          defaultExpanded={false}
          onSelectResource={onSelectResource}
        />
      )}

      {/* View Explorer Button */}
      {onViewExplorer && (
        <div style={{ marginTop: SPACING.xl, textAlign: 'center' }}>
          <button
            onClick={onViewExplorer}
            style={{
              padding: `${SPACING.md} ${SPACING.xl}`,
              background: SEMANTIC_COLORS.interactive,
              color: 'white',
              border: 'none',
              borderRadius: BORDER_RADIUS.sm,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: FONT_WEIGHTS.semibold,
            }}
          >
            View Detailed Analysis →
          </button>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  signals: RiskSignal[];
  defaultExpanded: boolean;
  onSelectResource?: (resourceId: string) => void;
}

function Section({ title, signals, defaultExpanded, onSelectResource }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{
      marginBottom: SPACING.lg,
      border: `1px solid ${SEMANTIC_COLORS.borderLight}`,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: SPACING.md,
          background: SEMANTIC_COLORS.bgSecondary,
          border: 'none',
          borderBottom: expanded ? `1px solid ${SEMANTIC_COLORS.borderLight}` : 'none',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1.1rem',
          fontWeight: FONT_WEIGHTS.semibold,
          color: SEMANTIC_COLORS.textPrimary,
        }}
      >
        <span>{title} ({signals.length})</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div style={{ padding: SPACING.md }}>
          {signals.map((signal, index) => (
            <RiskSignalCard key={index} signal={signal} onSelectResource={onSelectResource} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RiskSignalCardProps {
  signal: RiskSignal;
  onSelectResource?: (resourceId: string) => void;
}

function RiskSignalCard({ signal, onSelectResource }: RiskSignalCardProps) {
  const riskColors = getRiskColors(signal.level);
  const [hovered, setHovered] = useState(false);
  const isClickable = !!onSelectResource;

  return (
    <div
      onClick={isClickable ? () => onSelectResource(signal.resource) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom: SPACING.md,
        padding: SPACING.md,
        background: hovered && isClickable ? riskColors.border : riskColors.bg,
        border: `1px solid ${hovered && isClickable ? riskColors.text : riskColors.border}`,
        borderRadius: BORDER_RADIUS.sm,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
      }}>
        <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>{riskColors.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: SPACING.xs,
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: FONT_WEIGHTS.semibold,
              color: SEMANTIC_COLORS.textPrimary,
            }}>
              {signal.resource}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
              {isClickable && hovered && (
                <span style={{
                  fontSize: '0.75rem',
                  color: riskColors.text,
                  fontWeight: FONT_WEIGHTS.medium,
                  whiteSpace: 'nowrap',
                }}>
                  ↓ View in explorer
                </span>
              )}
              <span style={{
                padding: `2px ${SPACING.sm}`,
                background: riskColors.text,
                color: 'white',
                borderRadius: BORDER_RADIUS.sm,
                fontSize: '0.75rem',
                fontWeight: FONT_WEIGHTS.semibold,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {getRiskLabel(signal.level)}
              </span>
            </div>
          </div>
          <p style={{
            margin: 0,
            marginBottom: SPACING.sm,
            fontWeight: FONT_WEIGHTS.medium,
            color: SEMANTIC_COLORS.textPrimary,
          }}>
            {signal.title}
          </p>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: SEMANTIC_COLORS.textSecondary,
            lineHeight: '1.5',
          }}>
            {signal.description}
          </p>
          {signal.field && (
            <div style={{
              marginTop: SPACING.sm,
              fontSize: '0.85rem',
              color: SEMANTIC_COLORS.textTertiary,
            }}>
              Field: <code style={{ 
                background: SEMANTIC_COLORS.bgTertiary, 
                padding: '2px 6px',
                borderRadius: BORDER_RADIUS.sm,
                fontFamily: 'monospace',
              }}>
                {signal.field}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
