/**
 * OakView Chart Library
 *
 * A lightweight charting library based on TradingView's lightweight-charts v5
 * with built-in UI components and flexible data provider architecture.
 *
 * Main Entry Point: <oakview>
 * - Full-featured chart layout with toolbar, multiple panes, and flexible configuration
 * - Use this component for production applications
 *
 * For data loading, implement your own data provider by extending OakViewDataProvider
 * (see examples/csv-example/providers/csv-provider.js for reference)
 */

// Main component - full layout with toolbar (ONLY ENTRY POINT)
export { default as OakView } from './oakview-chart-layout.js';
export { default as OakViewChartLayout } from './oakview-chart-layout.js'; // Alias for compatibility

// Base data provider class for implementing custom providers
export { OakViewDataProvider } from './data-providers/index.js';

// Re-export lightweight-charts for advanced usage
export { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
