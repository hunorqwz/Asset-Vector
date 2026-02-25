/**
 * STANDARD INSTITUTIONAL CHART COLORS
 * 
 * These colors are strictly defined to match industry-standard
 * financial charting tools (e.g., TradingView, Bloomberg).
 * 
 * DO NOT change these to match the application's internal theme.
 * Charts should always use these exact standard colors to remain professional and familiar.
 */

export const CHART_COLORS = {
  // TradingView Standard Green (Up)
  BULLISH: '#089981',
  
  // TradingView Standard Red (Down)
  BEARISH: '#f23645',
  
  // Neutral/Overlay Colors
  CROSSHAIR: 'rgba(255, 255, 255, 0.2)',
  GRID_LINES: 'rgba(255, 255, 255, 0.03)',
  
  // Technical Indicators (Visually Distinct Trading Standard Colors)
  SMA_20: '#2962FF', // Distinct Blue
  SMA_50: '#FFD600', // Bright Yellow
  EMA_20: '#00E676', // Neon Green
  EMA_50: '#E91E63', // Magenta / Pink
  EMA_200: '#FF6D00', // Deep Orange
  BOLLINGER_BANDS: 'rgba(255, 255, 255, 0.05)',
  BOLLINGER_BANDS_LEGEND: 'rgba(255, 255, 255, 0.4)',
  NEURAL_VECTOR: '#818cf8',
  LEVEL_SUPPORT: 'rgba(34, 197, 94, 0.3)',
  LEVEL_RESISTANCE: 'rgba(239, 68, 68, 0.3)',
} as const;
