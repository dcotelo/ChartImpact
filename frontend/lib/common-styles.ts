import { SPACING, BORDER_RADIUS, SHADOWS } from './design-tokens';

/**
 * Common reusable style objects to reduce inline style duplication
 */

export const buttonPrimaryStyle: React.CSSProperties = {
  padding: '0.875rem 2rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: BORDER_RADIUS.md,
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

export const buttonSecondaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: BORDER_RADIUS.md,
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.xl,
  padding: `${SPACING['2xl']} ${SPACING.xl}`,
  boxShadow: SHADOWS.lg,
};

export const cardCompactStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: BORDER_RADIUS.lg,
  padding: SPACING.lg,
  boxShadow: SHADOWS.md,
};

export const fullscreenCenterStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${SPACING['2xl']} ${SPACING.xl}`,
  background: '#f8f9fa',
};

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #ddd',
  borderRadius: BORDER_RADIUS.md,
  fontSize: '1rem',
  backgroundColor: '#fff',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '600',
  color: '#333',
};

export const errorTextStyle: React.CSSProperties = {
  color: '#d32f2f',
  fontSize: '0.75rem',
  display: 'block',
  marginTop: '0.25rem',
};

export const helperTextStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '0.75rem',
  display: 'block',
  marginTop: '0.25rem',
};
