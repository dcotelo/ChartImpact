'use client';

import { CompareRequest } from '@/lib/types';

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
      marginBottom: '2rem',
      padding: '1.5rem',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <h3 style={{
        fontSize: '1.25rem',
        marginBottom: '1rem',
        color: '#333',
        fontWeight: '600'
      }}>
        📚 Demo Examples
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: '#666',
        marginBottom: '1rem'
      }}>
        Try these pre-configured examples to see how the diff viewer works:
      </p>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {demoExamples.map((example, index) => (
          <button
            key={index}
            onClick={() => onSelectExample(example.data)}
            style={{
              padding: '0.75rem 1rem',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            <div style={{ fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>
              {example.name}
            </div>
            <div style={{ color: '#666', fontSize: '0.85rem' }}>
              {example.description}
            </div>
          </button>
        ))}
      </div>
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#e7f3ff',
        borderRadius: '6px',
        fontSize: '0.85rem',
        color: '#0066cc'
      }}>
        <strong>💡 Tip:</strong> These examples use public Helm chart repositories. 
        You can modify the values or use your own repository URLs.
      </div>
    </div>
  );
}

