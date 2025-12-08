'use client';

import { useState } from 'react';
import { CompareForm } from '@/components/CompareForm';
import { DiffDisplay } from '@/components/DiffDisplay';
import { DemoExamples } from '@/components/DemoExamples';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { CompareResponse, CompareRequest } from '@/lib/types';

export default function Home() {
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompareRequest | undefined>(undefined);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const handleCompare = async (formData: CompareRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressMessage('Initializing comparison...');

    try {
      setProgressMessage('Cloning repository...');
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      setProgressMessage('Processing results...');
      const data: CompareResponse = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to compare versions';
        throw new Error(errorMsg);
      }

      setProgressMessage('Comparison complete!');
      setResult(data);
      
      // Clear progress message after a brief delay
      setTimeout(() => setProgressMessage(''), 1000);
    } catch (err: any) {
      let errorMessage = 'An error occurred';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error: Could not connect to the server. Please check your connection and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProgressMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        color: 'white'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '0.5rem',
          fontWeight: 'bold'
        }}>
          🔍 Helm Chart Diff Viewer
        </h1>
        <p style={{
          fontSize: '1.1rem',
          opacity: 0.9
        }}>
          Compare differences between two Helm chart versions
        </p>
      </div>

      <div style={{ padding: '2rem' }}>
        <DemoExamples onSelectExample={(data) => {
          setFormData(data);
        }} />
        <CompareForm 
          key={formData ? JSON.stringify(formData) : 'empty'}
          onSubmit={handleCompare} 
          loading={loading} 
          initialData={formData} 
        />

        {loading && progressMessage && (
          <ProgressIndicator 
            message={progressMessage}
            step={progressMessage.includes('complete') ? 5 : undefined}
            totalSteps={5}
          />
        )}

        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <strong style={{ fontSize: '1.1rem' }}>Error</strong>
            </div>
            <div style={{
              paddingLeft: '1.75rem',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {error}
            </div>
          </div>
        )}

        {result && (
          <div style={{ marginTop: '2rem' }}>
            <DiffDisplay result={result} />
          </div>
        )}
      </div>
    </main>
  );
}

