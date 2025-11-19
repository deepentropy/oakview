/**
 * OakView Chart Library
 *
 * A lightweight charting library based on TradingView's lightweight-charts v5
 * with built-in UI components and flexible data provider architecture.
 */

// Simple chart component (Web Component)
export { default as OakViewChart } from './oakview-chart.js';

// Main component - full layout with toolbar
export { default as OakViewChartLayout } from './oakview-chart-layout.js';

// Data providers
export { OakViewDataProvider, CSVDataProvider } from './data-providers/index.js';

// Re-export lightweight-charts for advanced usage
export { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
