'use client';

import { useState } from 'react';
import { CompareForm } from '@/components/CompareForm';
import { DiffDisplay } from '@/components/DiffDisplay';
import { DemoExamples } from '@/components/DemoExamples';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { CompareResponse, CompareRequest } from '@/lib/types';
import { API_ENDPOINTS } from '@/lib/api-config';

// UI state for client-side filtering and search
interface UIState {
  ignoreLabels: boolean;
  secretHandling: 'suppress' | 'show' | 'decode';
  contextLines: number;
  suppressKinds: string[];
  suppressRegex: string;
  searchQuery: string;
}

export default function Home() {
  // Raw diff data from initial compare (immutable once loaded)
  const [rawResult, setRawResult] = useState<CompareResponse | null>(null);
  
  // UI state for client-side transformations (does NOT trigger re-compare)
  const [uiState, setUIState] = useState<UIState>({
    ignoreLabels: false,
    secretHandling: 'suppress',
    contextLines: 3,
    suppressKinds: [],
    suppressRegex: '',
    searchQuery: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompareRequest | undefined>(undefined);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressStep, setProgressStep] = useState<number>(0);
  const [progressTotal] = useState<number>(7);

  const handleCompare = async (formData: CompareRequest) => {
    setLoading(true);
    setError(null);
    setRawResult(null);
    setProgressStep(0);
    
    // Reset UI state when starting a new compare
    setUIState({
      ignoreLabels: false,
      secretHandling: 'suppress',
      contextLines: 3,
      suppressKinds: [],
      suppressRegex: '',
      searchQuery: ''
    });
    
    // Progress steps: 1-Initializing, 2-Cloning, 3-Extracting v1, 4-Extracting v2, 
    // 5-Building dependencies, 6-Rendering templates, 7-Comparing
    
    try {
      setProgressMessage('Initializing comparison...');
      setProgressStep(1);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setProgressMessage('Cloning repository...');
      setProgressStep(2);
      
      const progressMessages = [
        'Cloning repository...',
        'Extracting version 1...',
        'Extracting version 2...',
        'Building chart dependencies...',
        'Rendering Helm templates...',
        'Comparing YAML differences...'
      ];

      let progressInterval: NodeJS.Timeout | null = null;
      let messageInterval: NodeJS.Timeout | null = null;

      try {
        progressInterval = setInterval(() => {
          setProgressStep((prev) => {
            if (prev < 6) return prev + 1;
            return prev;
          });
        }, 2000);

        let messageIndex = 0;
        messageInterval = setInterval(() => {
          if (messageIndex < progressMessages.length - 1) {
            messageIndex++;
            setProgressMessage(progressMessages[messageIndex]);
          }
        }, 2000);

        const response = await fetch(API_ENDPOINTS.compare, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (progressInterval) clearInterval(progressInterval);
        if (messageInterval) clearInterval(messageInterval);
        progressInterval = null;
        messageInterval = null;

        setProgressMessage('Processing results...');
        setProgressStep(6);

        let data: CompareResponse;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error(`Failed to parse response: ${response.statusText || 'Unknown error'}`);
        }

        if (!response.ok || !data.success) {
          const errorMsg = data?.error || 'Failed to compare versions';
          throw new Error(errorMsg);
        }

        setProgressMessage('Comparison complete!');
        setProgressStep(7);
        setRawResult(data);
        
        setTimeout(() => {
          setProgressMessage('');
          setProgressStep(0);
        }, 1500);
      } catch (err: any) {
        if (progressInterval) clearInterval(progressInterval);
        if (messageInterval) clearInterval(messageInterval);
        throw err;
      }
    } catch (err: any) {
      let errorMessage = 'An error occurred';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request was cancelled';
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error: Could not connect to the server. Please check your connection and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProgressMessage('');
      setProgressStep(0);
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
          🔍 Chart Impact
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
            step={progressStep}
            totalSteps={progressTotal}
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

        {rawResult && (
          <div style={{ marginTop: '2rem' }}>
            {/* Filter Controls - operates on rawResult without re-compare */}
            <div style={{
              padding: '1.5rem',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #ddd'
            }}>
              <h3 style={{
                fontSize: '1.1rem',
                marginBottom: '1rem',
                fontWeight: '600',
                color: '#333'
              }}>
                🔍 Filter & Search Results
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: '1fr'
              }}>
                {/* Search input */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '0.9rem'
                  }}>
                    Search diff content
                  </label>
                  <input
                    type="text"
                    value={uiState.searchQuery}
                    onChange={(e) => setUIState({ ...uiState, searchQuery: e.target.value })}
                    placeholder="Search for resource names, kinds, or content..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                {/* Filter toggles */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '0.75rem'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={uiState.ignoreLabels}
                      onChange={(e) => setUIState({ ...uiState, ignoreLabels: e.target.checked })}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#333' }}>
                      Ignore metadata/labels
                    </span>
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#333', fontWeight: '500' }}>
                      Secret handling:
                    </label>
                    <select
                      value={uiState.secretHandling}
                      onChange={(e) => setUIState({ ...uiState, secretHandling: e.target.value as 'suppress' | 'show' | 'decode' })}
                      style={{
                        padding: '0.4rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="suppress">Suppress (redact)</option>
                      <option value="show">Show</option>
                      <option value="decode">Decode base64</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#333', fontWeight: '500' }}>
                      Context lines:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={uiState.contextLines}
                      onChange={(e) => setUIState({ ...uiState, contextLines: parseInt(e.target.value) || 0 })}
                      style={{
                        width: '60px',
                        padding: '0.4rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DiffDisplay 
              result={rawResult}
              ignoreLabels={uiState.ignoreLabels}
              secretHandling={uiState.secretHandling}
              contextLines={uiState.contextLines}
              suppressKinds={uiState.suppressKinds}
              suppressRegex={uiState.suppressRegex}
              searchQuery={uiState.searchQuery}
            />
          </div>
        )}
      </div>
    </main>
  );
}
