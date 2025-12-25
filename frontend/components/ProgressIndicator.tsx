'use client';

interface ProgressIndicatorProps {
  message: string;
  step?: number;
  totalSteps?: number;
}

export function ProgressIndicator({ message, step, totalSteps }: ProgressIndicatorProps) {
  const percentage = step && totalSteps ? Math.round((step / totalSteps) * 100) : 0;

  return (
    <div style={{
      marginTop: '1.5rem',
      padding: '1.5rem',
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: step && totalSteps ? '0.75rem' : '0'
      }}>
        <div 
          style={{
            width: '20px',
            height: '20px',
            border: '3px solid #667eea',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            flexShrink: 0
          }}
        />
        <div style={{
          flex: 1,
          fontSize: '1rem',
          color: '#333',
          fontWeight: '500'
        }}>
          {message}
        </div>
      </div>
      {step && totalSteps && (
        <div style={{
          width: '100%',
          height: '6px',
          background: '#e9ecef',
          borderRadius: '3px',
          overflow: 'hidden',
          marginTop: '0.5rem'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            transition: 'width 0.3s ease',
            borderRadius: '3px'
          }} />
        </div>
      )}
    </div>
  );
}

