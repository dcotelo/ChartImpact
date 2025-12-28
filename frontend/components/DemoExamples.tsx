'use client';

import { CompareRequest } from '@/lib/types';
import { SPACING, SEMANTIC_COLORS, BRAND_COLORS, BORDER_RADIUS, GAP } from '@/lib/design-tokens';

interface DemoExample {
  name: string;
  description: string;
  data: CompareRequest;
}

const demoExamples: DemoExample[] = [
  {
    name: 'ArgoCD Version Comparison',
    description: 'Compare two ArgoCD release versions (9.1.5 vs 9.1.6)',
    data: {
      repository: 'https://github.com/argoproj/argo-helm.git',
      chartPath: 'charts/argo-cd',
      version1: 'argo-cd-9.1.5',
      version2: 'argo-cd-9.1.6',
    }
  },
  {
    name: 'DataDog Monorepo',
    description: 'Compare DataDog chart versions in monorepo structure (3.0.0 vs 3.1.0)',
    data: {
      repository: 'https://github.com/DataDog/helm-charts.git',
      chartPath: 'charts/datadog',
      version1: 'datadog-3.0.0',
      version2: 'datadog-3.1.0',
    }
  }
];

interface DemoExamplesProps {
  onSelectExample: (data: CompareRequest) => void;
}

export function DemoExamples({ onSelectExample }: DemoExamplesProps) {
  return (
    <div style={{
      marginBottom: SPACING.xl,
      padding: SPACING.lg,
      background: SEMANTIC_COLORS.bgSecondary,
      borderRadius: BORDER_RADIUS.md,
      border: `1px solid ${SEMANTIC_COLORS.borderLight}`
    }}>
      <h3 style={{
        fontSize: '1.25rem',
        marginBottom: SPACING.md,
        color: SEMANTIC_COLORS.textPrimary,
        fontWeight: '600'
      }}>
        🚀 Quick Start
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: SEMANTIC_COLORS.textSecondary,
        marginBottom: SPACING.md
      }}>
        See how ChartImpact surfaces deployment risks in real chart upgrades:
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: GAP.sm
      }}>
        {demoExamples.map((example, index) => (
          <button
            key={index}
            onClick={() => onSelectExample(example.data)}
            style={{
              padding: `${SPACING.sm} ${SPACING.md}`,
              background: SEMANTIC_COLORS.bgPrimary,
              border: `1px solid ${SEMANTIC_COLORS.borderLight}`,
              borderRadius: BORDER_RADIUS.sm,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = SEMANTIC_COLORS.bgTertiary;
              e.currentTarget.style.borderColor = BRAND_COLORS.primary;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = SEMANTIC_COLORS.bgPrimary;
              e.currentTarget.style.borderColor = SEMANTIC_COLORS.borderLight;
            }}
          >
            <div style={{ fontWeight: '600', color: SEMANTIC_COLORS.textPrimary, marginBottom: SPACING.xs }}>
              {example.name}
            </div>
            <div style={{ color: SEMANTIC_COLORS.textSecondary, fontSize: '0.85rem' }}>
              {example.description}
            </div>
          </button>
        ))}
      </div>
      <div style={{
        marginTop: SPACING.md,
        padding: SPACING.sm,
        background: SEMANTIC_COLORS.infoBg,
        borderRadius: BORDER_RADIUS.sm,
        fontSize: '0.85rem',
        color: SEMANTIC_COLORS.info
      }}>
        <strong>💡 Tip:</strong> These examples use public Helm chart repositories. 
        You can modify the values or use your own repository URLs.
      </div>
    </div>
  );
}

