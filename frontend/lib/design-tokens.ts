/**
 * Design Tokens for ChartImpact
 * 
 * Central source of truth for design values including colors, spacing,
 * typography, and other design primitives aligned with UX redesign.
 * 
 * Based on: ux-revamp/IMPLEMENTATION_ROADMAP.md Phase 1
 */

// ============================================================================
// Color Palette
// ============================================================================

/**
 * Brand Colors
 * Primary colors used for branding and key UI elements
 */
export const BRAND_COLORS = {
  primary: '#667eea',      // Primary brand color (purple-blue)
  primaryDark: '#764ba2',  // Darker shade for gradients
  primaryLight: '#8b9ef5', // Lighter shade for hover states
  accent: '#3b82f6',       // Accent color (blue)
} as const;

/**
 * Risk Colors
 * Colors for indicating different risk levels with proper contrast
 * All colors meet WCAG AA contrast requirements
 */
export const RISK_COLORS = {
  high: '#dc2626',       // Red for high risk
  highBg: '#fee',        // Light red background
  highBorder: '#fcc',    // Light red border
  
  medium: '#f59e0b',     // Amber for medium risk
  mediumBg: '#fffbeb',   // Light amber background
  mediumBorder: '#fed7aa', // Light amber border
  
  low: '#6b7280',        // Gray for low risk
  lowBg: '#f9fafb',      // Light gray background
  lowBorder: '#e5e7eb',  // Light gray border
  
  success: '#10b981',    // Green for success states
  successBg: '#ecfdf5',  // Light green background
  successBorder: '#a7f3d0', // Light green border
} as const;

/**
 * Neutral Colors
 * Grayscale palette for text, backgrounds, and borders
 */
export const NEUTRAL_COLORS = {
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  black: '#000000',
} as const;

/**
 * Semantic Colors
 * Colors mapped to semantic meanings
 */
export const SEMANTIC_COLORS = {
  // Text colors
  textPrimary: NEUTRAL_COLORS.gray900,
  textSecondary: NEUTRAL_COLORS.gray600,
  textTertiary: NEUTRAL_COLORS.gray500,
  textDisabled: NEUTRAL_COLORS.gray400,
  textInverse: NEUTRAL_COLORS.white,
  
  // Background colors
  bgPrimary: NEUTRAL_COLORS.white,
  bgSecondary: NEUTRAL_COLORS.gray50,
  bgTertiary: NEUTRAL_COLORS.gray100,
  bgDisabled: NEUTRAL_COLORS.gray200,
  
  // Border colors
  borderLight: NEUTRAL_COLORS.gray200,
  borderMedium: NEUTRAL_COLORS.gray300,
  borderStrong: NEUTRAL_COLORS.gray400,
  
  // Interactive colors
  interactive: BRAND_COLORS.primary,
  interactiveHover: BRAND_COLORS.primaryLight,
  
  // Status colors
  error: RISK_COLORS.high,
  errorBg: RISK_COLORS.highBg,
  warning: RISK_COLORS.medium,
  warningBg: RISK_COLORS.mediumBg,
  success: RISK_COLORS.success,
  successBg: RISK_COLORS.successBg,
  info: BRAND_COLORS.accent,
  infoBg: '#dbeafe',
} as const;

// ============================================================================
// Spacing Scale
// ============================================================================

/**
 * Spacing Scale (8px system)
 * All spacing values are multiples of 8px for consistent rhythm
 */
export const SPACING = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
  '4xl': '6rem',    // 96px
} as const;

/**
 * Gap Scale (for flex/grid gaps)
 */
export const GAP = {
  xs: '0.5rem',     // 8px
  sm: '0.75rem',    // 12px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
} as const;

// ============================================================================
// Typography Scale
// ============================================================================

/**
 * Font Families
 */
export const FONT_FAMILIES = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

/**
 * Font Sizes (mobile-first)
 */
export const FONT_SIZES = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
} as const;

/**
 * Font Weights
 */
export const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Line Heights
 */
export const LINE_HEIGHTS = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.75',
} as const;

// ============================================================================
// Border Radius
// ============================================================================

/**
 * Border Radius Values
 */
export const BORDER_RADIUS = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// Shadows
// ============================================================================

/**
 * Box Shadow Values
 */
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ============================================================================
// Transitions
// ============================================================================

/**
 * Transition Durations
 */
export const TRANSITIONS = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

/**
 * Transition Timing Functions
 */
export const EASINGS = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================================================
// Z-Index Scale
// ============================================================================

/**
 * Z-Index Values
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// Breakpoints
// ============================================================================

/**
 * Responsive Breakpoints
 */
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Risk Level Utilities
// ============================================================================

import type { RiskLevel } from './types';

/**
 * Get colors for a specific risk level
 */
export function getRiskColors(level: RiskLevel) {
  switch (level) {
    case 'high':
      return {
        text: RISK_COLORS.high,
        bg: RISK_COLORS.highBg,
        border: RISK_COLORS.highBorder,
        icon: '🔴',
      };
    case 'medium':
      return {
        text: RISK_COLORS.medium,
        bg: RISK_COLORS.mediumBg,
        border: RISK_COLORS.mediumBorder,
        icon: '🟡',
      };
    case 'low':
      return {
        text: RISK_COLORS.low,
        bg: RISK_COLORS.lowBg,
        border: RISK_COLORS.lowBorder,
        icon: '⚪',
      };
    default:
      return {
        text: NEUTRAL_COLORS.gray600,
        bg: NEUTRAL_COLORS.gray50,
        border: NEUTRAL_COLORS.gray200,
        icon: '⚪',
      };
  }
}

/**
 * Get risk level label
 */
export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
    default:
      return 'Unknown';
  }
}
