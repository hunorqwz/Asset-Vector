/**
 * STANDARD INSTITUTIONAL CHART COLORS
 * 
 * Centralized color registry for all charting components (Canvas, Lightweight-Charts).
 * Ensures consistency between Tailwind CSS variables and procedural rendering.
 */

export const THEME_HSL = {
  BULL: '156 72% 48%',
  BEAR: '0 85% 62%',
  MATRIX: '204 100% 40%',
  TERMINAL: '240 5% 45%',
  GRID: '240 5% 12%'
} as const;

export const CHART_COLORS = {
  // Brand Mapping
  BULLISH: '#22d369', 
  BEARISH: '#f87171', 
  
  // High-Performance Procedural Rendering (Canvas)
  HSL: THEME_HSL,

  // Neutral/Overlay Colors
  CROSSHAIR: 'rgba(255, 255, 255, 0.2)',
  GRID_LINES: 'rgba(255, 255, 255, 0.03)',
  
  // Technical Indicators (Visually Distinct Trading Standard Colors)
  SMA_20: '#2962FF', 
  SMA_50: '#FFD600', 
  EMA_20: '#00E676', 
  EMA_50: '#E91E63', 
  EMA_200: '#FF6D00', 
  BOLLINGER_BANDS: 'rgba(255, 255, 255, 0.05)',
  BOLLINGER_BANDS_LEGEND: 'rgba(255, 255, 255, 0.4)',
  NEURAL_VECTOR: '#818cf8',
  LEVEL_SUPPORT: 'rgba(34, 197, 94, 0.3)',
  LEVEL_RESISTANCE: 'rgba(239, 68, 68, 0.3)',
} as const;

/**
 * Resolves a CSS variable reference (e.g. var(--bull)) to its raw HSL values
 * for use in Canvas Rendering Contexts.
 */
export function resolveCanvasColor(cssVar: string): string {
  if (cssVar.includes('--bull')) return THEME_HSL.BULL;
  if (cssVar.includes('--bear')) return THEME_HSL.BEAR;
  if (cssVar.includes('--matrix')) return THEME_HSL.MATRIX;
  return THEME_HSL.TERMINAL;
}
