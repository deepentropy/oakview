/**
 * OakView Chart Library
 *
 * A lightweight charting library based on TradingView's lightweight-charts v5
 * with built-in UI components and flexible data provider architecture.
 */

// Main component - full layout with toolbar
export { default as OakViewChartLayout } from './oakview-chart-layout.js';

// Data provider base class (for implementing custom providers)
export { OakViewDataProvider } from './data-providers/index.js';

// Re-export lightweight-charts for advanced usage
export { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
