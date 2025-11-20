import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries
} from 'lightweight-charts';
import cssVariables from './oakview-variables.css?inline';
import BarResampler from './utils/BarResampler.js';

/**
 * OakView Chart Web Component with Built-in UI
 * A custom element wrapper for TradingView's Lightweight Charts with toolbar
 *
 * Usage:
 *   <oakview-chart symbol="SPX" show-toolbar="true"></oakview-chart>
 *
 * Data loading must be done via setData() method or data provider:
 *   chart.setData(ohlcvData);
 *   // or
 *   chart.setDataProvider(myDataProvider);
 */
class OakViewChart extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.chart = null;
    this.series = new Map();
    this.currentSeries = null;
    this._currentChartType = 'candlestick';
    this._data = [];
    this._dataProvider = null;
    this._subscriptionUnsubscribe = null;
  }

  static get observedAttributes() {
    return ['width', 'height', 'theme', 'symbol', 'show-toolbar', 'hide-sidebar'];
  }

  async connectedCallback() {
    this.render();

    // Defer chart initialization to next frame to ensure container has dimensions
    requestAnimationFrame(() => {
      this.initChart();
      this.setupEventListeners();
      this.loadIndicators();
    });

    // No need for manual resize observer when using autoSize
    // The chart will automatically resize to fit its container
  }

  /**
   * Set a custom data provider
   * @param {OakViewDataProvider} provider - Data provider instance
   * @public
   */
  setDataProvider(provider) {
    this._dataProvider = provider;
    // Update available intervals for current symbol
    const symbol = this.getAttribute('symbol');
    if (symbol) {
      this.updateAvailableIntervals(symbol);
    }
  }

  /**
   * Get the current data provider
   * @returns {OakViewDataProvider|null}
   * @public
   */
  getDataProvider() {
    return this._dataProvider;
  }

  /**
   * Update chart with real-time data (efficient single-point update)
   * @param {Object} data - OHLCV data point
   * @public
   */
  updateRealtime(data) {
    if (!this.currentSeries) return;

    try {
      // Convert data format for line series
      if (this._currentChartType === 'line') {
        this.currentSeries.update({ time: data.time, value: data.close });
      } else {
        this.currentSeries.update(data);
      }
    } catch (error) {
      console.error('Failed to update realtime data:', error);
    }
  }

  /**
   * Set bulk data (replaces all existing data)
   * This updates the current series based on the selected chart type.
   * For advanced use cases, get the chart instance with getChart() and manage series directly.
   * @param {Array} data - Array of OHLCV data
   * @public
   */
  setData(data) {
    this._data = data;
    this.updateChartType();
    
    // Update legend with current symbol and interval
    const symbol = this.getAttribute('symbol');
    const interval = this.getAttribute('interval') || '1D';
    if (symbol) {
      this.updateLegend(symbol, interval);
    }
  }

  /**
   * Resample historical OHLCV data from finer to coarser interval
   * 
   * @param {Array} sourceBars - Source OHLCV bars (fine granularity)
   * @param {string} targetInterval - Target interval (e.g., '10S', '1', '1D')
   * @returns {Array} Resampled OHLCV bars (coarse granularity)
   * @public
   * @example
   * // Resample 1-second bars to 10-second bars
   * const secondBars = await provider.fetchHistorical('SPX', '1S');
   * const tenSecondBars = chart.resampleHistoricalData(secondBars, '10S');
   * chart.setData(tenSecondBars);
   */
  resampleHistoricalData(sourceBars, targetInterval) {
    if (!sourceBars || sourceBars.length === 0) {
      return [];
    }
    
    const resampler = new BarResampler('source', targetInterval);
    const resampledBars = [];
    
    for (const bar of sourceBars) {
      const resampledBar = resampler.addBar(bar);
      if (resampledBar) {
        resampledBars.push(resampledBar);
      }
    }
    
    // Flush the last incomplete bar
    const lastBar = resampler.flush();
    if (lastBar) {
      resampledBars.push(lastBar);
    }
    
    return resampledBars;
  }

  /**
   * Load symbol data with optional client-side resampling
   * 
   * If the data provider declares a base interval and the requested interval
   * is coarser, this will fetch base interval data and resample client-side.
   * 
   * @param {string} symbol - Symbol to load
   * @param {string} interval - Requested interval
   * @returns {Promise<void>}
   * @public
   */
  async loadSymbolData(symbol, interval) {
    if (!this._dataProvider) {
      console.warn('No data provider set');
      return;
    }
    
    try {
      // Update symbol and interval attributes
      this.setAttribute('symbol', symbol);
      this.setAttribute('interval', interval);
      
      const baseInterval = this._dataProvider.getBaseInterval?.(symbol);
      
      // If no base interval or requesting base interval, fetch directly
      if (!baseInterval || interval === baseInterval) {
        const data = await this._dataProvider.fetchHistorical(symbol, interval);
        this.setData(data);
        this.updateLegend(symbol, interval);
        return;
      }
      
      // Check if we need to resample
      const baseMs = this.parseIntervalToMs(baseInterval);
      const targetMs = this.parseIntervalToMs(interval);
      
      if (targetMs > baseMs) {
        // Fetch base interval data and resample to target
        console.log(`📊 Fetching ${symbol} @ ${baseInterval} (base) → resampling to ${interval}`);
        
        const baseData = await this._dataProvider.fetchHistorical(symbol, baseInterval);
        const resampledData = this.resampleHistoricalData(baseData, interval);
        
        console.log(`✅ Resampled ${baseData.length} bars → ${resampledData.length} bars`);
        this.setData(resampledData);
        this.updateLegend(symbol, interval);
      } else {
        // Target interval is finer than base - must request from provider
        const data = await this._dataProvider.fetchHistorical(symbol, interval);
        this.setData(data);
        this.updateLegend(symbol, interval);
      }
    } catch (error) {
      console.error('Failed to load symbol data:', error);
      throw error;
    }
  }

  /**
   * Get the lightweight-charts instance for full control
   * @returns {IChartApi|null}
   * @public
   * @example
   *   const chart = oakview.getChart();
   *   const series = chart.addSeries(CandlestickSeries, { upColor: '#26a69a' });
   *   series.setData(data);
   */
  getChart() {
    return this.chart;
  }

  /**
   * Load available indicators from the oakscript-engine examples folder
   */
  async loadIndicators() {
    try {
      // Hardcode indicators for now - TODO: load from external manifest
      // Indicators are now part of oakview project
      // Use absolute path from project root (leading slash)
      const basePath = '/src/indicators';
      const indicators = [
        {
          "id": "average-day-range",
          "title": "Average Day Range",
          "overlay": false,
          "precision": 2,
          "calculationModule": `${basePath}/average-day-range-calculation.js`,
          "indicatorModule": `${basePath}/average-day-range.js`
        },
        {
          "id": "balance-of-power",
          "title": "Balance of Power",
          "overlay": false,
          "precision": 2,
          "calculationModule": `${basePath}/balance-of-power-calculation.js`,
          "indicatorModule": `${basePath}/balance-of-power.js`
        },
        {
          "id": "moving-average-ribbon",
          "title": "Moving Average Ribbon",
          "overlay": true,
          "precision": 2,
          "calculationModule": `${basePath}/moving-average-ribbon-calculation.js`,
          "indicatorModule": `${basePath}/moving-average-ribbon.js`
        },
        {
          "id": "momentum",
          "title": "Momentum",
          "overlay": false,
          "precision": 2,
          "calculationModule": `${basePath}/momentum-calculation.js`,
          "indicatorModule": `${basePath}/momentum.js`
        }
      ];

      this.renderIndicators(indicators);
      console.log(`Loaded ${indicators.length} indicators`);
    } catch (error) {
      console.error('Failed to load indicators:', error);
    }
  }

  /**
   * Render indicators in the modal
   */
  renderIndicators(indicators) {
    const container = this.shadowRoot.querySelector('.indicator-list-container');
    if (!container) return;

    container.innerHTML = indicators.map(indicator => `
      <div class="indicator-list-item" data-indicator-id="${indicator.id}" data-indicator-module="${indicator.indicatorModule}" data-indicator-calc="${indicator.calculationModule}">
        <span class="indicator-favorite">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
            <path fill-rule="evenodd" d="m12.13 5.74 3.37.9-2.44 2.06L13.9 13 9 10.38 4.1 13l.94-4.3-2.44-2.06 3.37-.9L9 2l3.13 3.74Zm1.99 2-1.68 1.42.4 2.96L9 10.66l-3.84 1.46.4-2.96-1.68-1.42 3-.6L9 4.56l2.12 2.56 3 .61Z"></path>
          </svg>
        </span>
        <div class="indicator-list-item-main">
          <div class="indicator-list-item-title">${indicator.title}</div>
        </div>
        <div class="indicator-actions">
          <span class="indicator-action-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
              <path fill="currentColor" d="M.5 9l-.22-.45a.5.5 0 0 0 0 .9L.5 9zm17 0l.22.45a.5.5 0 0 0 0-.9L17.5 9zm-15.66.67l-.22.45.22-.45zM7 2H5.5v1H7V2zM3 4.5v1.15h1V4.5H3zM1.62 7.88l-1.34.67.44.9 1.35-.67-.45-.9zM.28 9.45l1.34.67.45-.9-1.35-.67-.44.9zM3 12.35v1.15h1v-1.15H3zM5.5 16H7v-1H5.5v1zM11 3h1.5V2H11v1zm3 1.5v1.15h1V4.5h-1zm1.93 4.28l1.35.67.44-.9-1.34-.67-.45.9zm1.35-.23l-1.35.67.45.9 1.34-.67-.44-.9zM14 12.35v1.15h1v-1.15h-1zM12.5 15H11v1h1.5v-1zm3.43-5.78A3.5 3.5 0 0 0 14 12.35h1c0-.94.54-1.8 1.38-2.23l-.45-.9zM14 5.65a3.5 3.5 0 0 0 1.93 3.13l.45-.9A2.5 2.5 0 0 1 15 5.65h-1zM12.5 3c.83 0 1.5.67 1.5 1.5h1A2.5 2.5 0 0 0 12.5 2v1zM3 13.5A2.5 2.5 0 0 0 5.5 16v-1A1.5 1.5 0 0 1 4 13.5H3zm-1.38-3.38A2.5 2.5 0 0 1 3 12.35h1a3.5 3.5 0 0 0-1.93-3.13l-.45.9zM3 5.65a2.5 2.5 0 0 1-1.38 2.23l.45.9A3.5 3.5 0 0 0 4 5.65H3zm11 7.85c0 .83-.67 1.5-1.5 1.5v1a2.5 2.5 0 0 0 2.5-2.5h-1zM5.5 2A2.5 2.5 0 0 0 3 4.5h1C4 3.67 4.67 3 5.5 3V2z"></path>
            </svg>
          </span>
        </div>
      </div>
    `).join('');

    // Add click event listeners to indicator items
    container.querySelectorAll('.indicator-list-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Don't trigger if clicking favorite star
        if (e.target.closest('.indicator-favorite')) {
          return;
        }

        const indicatorId = item.dataset.indicatorId;
        const indicatorModule = item.dataset.indicatorModule;
        const calcModule = item.dataset.indicatorCalc;

        console.log(`Loading indicator: ${indicatorId}`);

        try {
          await this.loadIndicatorOnChart(indicatorId, indicatorModule, calcModule);

          // Close the modal
          const modal = this.shadowRoot.querySelector('.indicator-modal');
          if (modal) {
            modal.classList.remove('show');
          }
        } catch (error) {
          console.error(`Failed to load indicator ${indicatorId}:`, error);
          alert(`Failed to load indicator: ${error.message}`);
        }
      });
    });
  }

  /**
   * Load and display an indicator on the chart
   */
  async loadIndicatorOnChart(indicatorId, indicatorModulePath, calcModulePath) {
    console.log(`Loading indicator modules for ${indicatorId}`);
    console.log(`Indicator module: ${indicatorModulePath}`);

    // If this is the control chart (toolbar chart), get the pane chart from parent layout
    let targetChart = this;
    const isControlChart = this.classList.contains('control-chart');

    if (isControlChart) {
      console.log('This is control chart, getting pane chart from parent layout');
      const layout = this.getRootNode().host; // Get the layout element
      if (layout && layout.getSelectedChart) {
        targetChart = layout.getSelectedChart(); // Get selected pane chart
        console.log('Target chart:', targetChart);
      }
    }

    if (!targetChart || !targetChart.chart) {
      console.error('No target chart available');
      return;
    }

    // Get data from target chart
    const chartData = targetChart._data;
    console.log('Chart data available:', chartData?.length || 0, 'bars');
    console.log('_data:', targetChart._data?.length);

    if (!chartData || chartData.length === 0) {
      console.error('No data available for indicator calculation');
      return;
    }

    try {
      // Dynamically import the indicator module
      const module = await import(/* @vite-ignore */ indicatorModulePath);
      console.log('Indicator module loaded:', module);

      // Get the create function - try different naming conventions
      const createFnName = this.getIndicatorCreateFunctionName(indicatorId);
      const createFn = module[createFnName] || module.default;

      if (!createFn) {
        throw new Error(`Could not find create function ${createFnName} in module`);
      }

      // Get the main series from target chart
      const mainSeries = targetChart.currentSeries || targetChart.series;
      console.log('Main series:', mainSeries);

      if (!mainSeries) {
        throw new Error('No main series available');
      }

      // Create the indicator instance
      console.log(`Creating indicator with ${chartData.length} bars`);
      const indicator = createFn(targetChart.chart, mainSeries, {}, chartData);
      console.log('Indicator created:', indicator);

      // Attach the indicator to the chart
      indicator.attach();
      console.log(`✓ Indicator ${indicatorId} attached successfully`);

      // Store indicator reference for later removal
      if (!targetChart._indicators) {
        targetChart._indicators = [];
      }
      targetChart._indicators.push({
        id: indicatorId,
        instance: indicator
      });

      // Add indicator legend entry
      await targetChart.addIndicatorLegend(indicatorId, indicator.metadata);

      // Save indicator to configuration
      if (isControlChart) {
        // Get the layout element (control chart is in layout's shadow root)
        const layout = this.getRootNode().host;

        if (layout && layout.updatePaneConfig) {
          const selectedPaneIndex = layout._selectedPane;
          const paneId = layout.getPaneId(selectedPaneIndex);
          const settings = layout.getPaneSettings(selectedPaneIndex);

          if (settings && paneId !== null) {
            // Add indicator to the list if not already there
            if (!settings.indicators) {
              settings.indicators = [];
            }
            if (!settings.indicators.includes(indicatorId)) {
              settings.indicators.push(indicatorId);
              layout.saveConfiguration();
              console.log(`[OakView] Saved indicator ${indicatorId} to pane ${selectedPaneIndex}`);
            }
          }
        }
      }

    } catch (error) {
      console.error(`Failed to load indicator ${indicatorId}:`, error);
      throw error;
    }
  }

  /**
   * Get the expected create function name for an indicator
   * Converts "average-day-range" to "createAverageDayRangeIndicator"
   */
  getIndicatorCreateFunctionName(indicatorId) {
    // Convert kebab-case to PascalCase
    const pascalCase = indicatorId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `create${pascalCase}Indicator`;
  }

  disconnectedCallback() {
    // Cleanup subscription if exists
    if (this._subscriptionUnsubscribe) {
      this._subscriptionUnsubscribe();
      this._subscriptionUnsubscribe = null;
    }

    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'theme' && this.chart) {
      this.applyTheme(newValue);
    }

    if (name === 'symbol') {
      const symbolBtn = this.shadowRoot.querySelector('.symbol-button');
      if (symbolBtn) symbolBtn.textContent = newValue || 'SYMBOL';
    }
  }

  render() {
    const showToolbar = this.getAttribute('show-toolbar') !== 'false';
    const hideSidebar = this.getAttribute('hide-sidebar') === 'true';

    const style = document.createElement('style');
    style.textContent = `
      ${cssVariables}

      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 400px;
        background: var(--bg-primary);
        font-family: var(--font-primary);
        position: relative;
      }

      .wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        flex: 1;
      }

      .toolbar {
        display: ${showToolbar ? 'flex' : 'none'};
        height: var(--navbar-height);
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-primary);
        align-items: center;
        padding: 0 var(--space-4);
        gap: var(--gap-normal);
        flex-shrink: 0;
        font-family: var(--font-primary);
        font-size: var(--font-size-14);
        font-feature-settings: "lnum", "tnum";
      }

      .main-content {
        flex: 1;
        display: flex;
        min-height: 0;
      }

      .sidebar-left {
        display: ${hideSidebar ? 'none' : 'flex'};
        flex-direction: column;
        width: var(--toolbar-width);
        background: var(--bg-primary);
        border-right: 1px solid var(--border-primary);
        flex-shrink: 0;
        align-items: center;
        padding: var(--space-2) 0;
      }

      .chart-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      }

      .sidebar-right {
        display: ${hideSidebar ? 'none' : 'flex'};
        flex-direction: column;
        width: var(--panel-width);
        background: var(--bg-primary);
        border-left: 1px solid var(--border-primary);
        flex-shrink: 0;
        overflow-y: auto;
      }

      .bottom-bar {
        display: ${hideSidebar ? 'none' : 'block'};
        height: var(--bottom-bar-height);
        background: var(--bg-primary);
        border-top: 1px solid var(--border-primary);
        flex-shrink: 0;
      }

      .chart-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        min-height: 0;
        background: var(--bg-primary);
      }

      .chart-legend {
        position: absolute;
        top: 8px;
        left: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10;
        pointer-events: none;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .legend-titles {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
      }

      .legend-symbol {
        font-weight: 600;
        color: var(--text-primary);
      }

      .legend-separator {
        color: var(--text-secondary);
        opacity: 0.4;
        font-size: 12px;
      }

      .legend-timeframe,
      .legend-exchange {
        color: var(--text-secondary);
        font-size: 12px;
      }

      .legend-values {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
      }

      .legend-value-item {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .legend-value-title {
        color: var(--text-secondary);
        opacity: 0.7;
        font-weight: 400;
      }

      .legend-value-data {
        color: var(--text-primary);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .indicators-legend {
        position: absolute;
        top: 32px; /* Position below the main legend (main legend is ~24px tall) */
        left: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 10;
        pointer-events: none;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .indicator-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }

      .indicator-legend-name {
        font-weight: 500;
        color: var(--text-primary);
      }

      .indicator-legend-params {
        color: var(--text-secondary);
        opacity: 0.8;
      }

      .indicator-legend-value {
        color: var(--text-primary);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .separator {
        width: 1px;
        height: 24px;
        background: #4a4a4a;
        margin: 0 8px;
        flex-shrink: 0;
      }

      .toolbar-button {
        background: transparent;
        border: none;
        color: #dbdbdb;
        padding: 6px 8px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        white-space: nowrap;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .toolbar-button:hover {
        background: #2e2e2e;
        color: #dbdbdb;
      }

      .toolbar-button.active {
        background: #132042;
        color: #2962ff;
      }

      .toolbar-button.active:hover {
        background: #142e61;
        color: #1e53e5;
      }

      .toolbar-button svg {
        flex-shrink: 0;
      }

      .symbol-button {
        font-weight: 600;
        font-size: 14px;
      }

      .timeframe-group {
        display: flex;
        gap: 2px;
      }

      .timeframe-button {
        padding: 4px 8px;
        font-size: 12px;
        min-width: 32px;
      }

      .chart-style-button svg {
        width: 28px;
        height: 28px;
      }

      /* Icon-only buttons */
      .toolbar-button.icon-only {
        padding: 4px;
        min-width: 36px;
        min-height: 36px;
        justify-content: center;
      }

      /* Radio group for timeframes */
      .timeframe-radio-group {
        display: flex;
        gap: 0;
        background: transparent;
        border-radius: 4px;
      }

      .timeframe-radio-group .toolbar-button {
        border-radius: 0;
        padding: 4px 8px;
        font-size: 13px;
        min-width: 32px;
        justify-content: center;
        position: relative;
      }

      .timeframe-radio-group .toolbar-button:first-child {
        border-radius: 4px 0 0 4px;
      }

      .timeframe-radio-group .toolbar-button:last-child {
        border-radius: 0 4px 4px 0;
      }

      .timeframe-radio-group .toolbar-button.active {
        background: #132042;
        color: #2962ff;
      }

      /* Dropdown arrow button */
      .dropdown-arrow-button {
        padding: 6px;
        min-width: 28px;
      }

      .dropdown-arrow-button svg {
        width: 16px;
        height: 8px;
      }

      .dropdown {
        position: relative;
      }

      .dropdown-menu {
        position: fixed;
        margin-top: 4px;
        background: #1e222d;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        display: none;
        max-height: 425px;
        overflow-y: auto;
      }

      .dropdown-menu.show {
        display: block;
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        color: #dbdbdb;
        cursor: pointer;
        transition: background 0.2s;
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        font-size: 13px;
        position: relative;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .dropdown-item:hover {
        background: #2a2e39;
        color: #dbdbdb;
      }

      .dropdown-item.active {
        background: #2962ff;
        color: #dbdbdb;
      }

      .dropdown-item-icon {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dropdown-item-icon svg {
        width: 28px;
        height: 28px;
      }

      .dropdown-item-label {
        flex: 1;
        min-width: 0;
      }

      .dropdown-item-favorite {
        width: 18px;
        height: 18px;
        color: #787b86;
        opacity: 0;
        transition: opacity 0.2s;
        cursor: pointer;
      }

      .dropdown-item:hover .dropdown-item-favorite {
        opacity: 1;
      }

      .dropdown-item-favorite.checked {
        opacity: 1;
        color: #ffb800;
      }

      .dropdown-item-favorite svg {
        width: 18px;
        height: 18px;
      }

      .dropdown-separator {
        height: 1px;
        background: #2a2e39;
        margin: 4px 0;
      }

      .interval-custom-item {
        cursor: pointer;
      }

      .interval-custom-item:hover {
        background: #2a2e39;
      }

      .interval-section {
        width: 100%;
      }

      .interval-section-header {
        padding: 8px 12px;
        color: #dbdbdb;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: background 0.2s;
      }

      .interval-section-header:hover {
        background: #2a2e39;
      }

      .interval-section-header svg {
        width: 16px;
        height: 8px;
        transition: transform 0.2s;
      }

      .interval-section.collapsed .interval-section-header svg {
        transform: rotate(-90deg);
      }

      .interval-section-items {
        display: block;
      }

      .interval-section.collapsed .interval-section-items {
        display: none;
      }

      .interval-dropdown-menu {
        min-width: 200px;
      }

      .indicators-button {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .indicators-button svg {
        width: 28px;
        height: 28px;
      }

      .favorites-arrow {
        padding: 4px 6px;
        margin-left: -4px;
      }

      .favorites-arrow svg {
        width: 16px;
        height: 8px;
      }

      .indicator-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: none;
      }

      .indicator-modal.show {
        display: block;
      }

      .indicator-modal-dialog {
        position: absolute;
        background: #1e222d;
        border-radius: 6px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        width: 650px;
        height: 385px;
        top: 20px;
        left: 348px;
        display: flex;
        flex-direction: column;
      }

      .indicator-modal-header {
        padding: 12px 16px;
        border-bottom: 1px solid #2a2e39;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
      }

      .indicator-modal-title {
        font-size: 14px;
        font-weight: 500;
        color: #dbdbdb;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .indicator-modal-close {
        background: transparent;
        border: none;
        color: #787b86;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .indicator-modal-close:hover {
        background: #2a2e39;
      }

      .indicator-modal-close svg {
        width: 18px;
        height: 18px;
      }

      .indicator-search-wrapper {
        padding: 12px 16px;
        border-bottom: 1px solid #2a2e39;
      }

      .indicator-search-container {
        position: relative;
        background: #131722;
        border: 1px solid #434651;
        border-radius: 4px;
        display: flex;
        align-items: center;
        padding: 8px 12px;
      }

      .indicator-search-icon {
        color: #787b86;
        flex-shrink: 0;
        margin-right: 8px;
      }

      .indicator-search-icon svg {
        width: 28px;
        height: 28px;
      }

      .indicator-search {
        flex: 1;
        background: transparent;
        border: none;
        color: #dbdbdb;
        font-size: 14px;
        outline: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .indicator-search::placeholder {
        color: #787b86;
      }

      .indicator-content {
        flex: 1;
        display: flex;
        min-height: 0;
      }

      .indicator-sidebar {
        width: 180px;
        background: #131722;
        border-right: 1px solid #2a2e39;
        overflow-y: auto;
        padding: 12px 0;
      }

      .indicator-sidebar-section {
        margin-bottom: 16px;
      }

      .indicator-sidebar-title {
        padding: 8px 16px;
        font-size: 11px;
        font-weight: 600;
        color: #787b86;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .indicator-sidebar-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        cursor: pointer;
        color: #dbdbdb;
        font-size: 13px;
        transition: background 0.2s;
      }

      .indicator-sidebar-item:hover {
        background: #2a2e39;
      }

      .indicator-sidebar-item.active {
        background: #2962ff;
        color: #dbdbdb;
      }

      .indicator-sidebar-item svg {
        width: 28px;
        height: 28px;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .indicator-main {
        flex: 1;
        overflow-y: auto;
        background: #1e222d;
      }

      .indicator-list-header {
        padding: 12px 16px;
        font-size: 13px;
        font-weight: 600;
        color: #dbdbdb;
        border-bottom: 1px solid #2a2e39;
      }

      .indicator-list-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        border-bottom: 1px solid #2a2e39;
        cursor: pointer;
        transition: background 0.2s;
        gap: 12px;
      }

      .indicator-list-item:hover {
        background: #2a2e39;
      }

      .indicator-favorite {
        width: 18px;
        height: 18px;
        cursor: pointer;
        color: #787b86;
        flex-shrink: 0;
      }

      .indicator-favorite.checked {
        color: #ffb800;
      }

      .indicator-favorite svg {
        width: 18px;
        height: 18px;
      }

      .indicator-list-item-main {
        flex: 1;
        min-width: 0;
      }

      .indicator-list-item-title {
        font-size: 13px;
        color: #dbdbdb;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .indicator-list-item-author {
        font-size: 12px;
        color: #2962ff;
        text-decoration: none;
        margin-right: 8px;
      }

      .indicator-list-item-likes {
        font-size: 12px;
        color: #787b86;
      }

      .indicator-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .indicator-action-icon {
        width: 18px;
        height: 18px;
        color: #787b86;
        cursor: pointer;
        transition: color 0.2s;
      }

      .indicator-action-icon:hover {
        color: #dbdbdb;
      }

      .indicator-action-icon svg {
        width: 18px;
        height: 18px;
      }

      /* Symbol Search Modal */
      .symbol-search-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(2px);
        display: none;
        align-items: flex-start;
        justify-content: center;
        z-index: 10001;
      }

      .symbol-search-modal.show {
        display: flex;
      }

      .symbol-search-content {
        background: #1E222D;
        border-radius: 8px;
        margin-top: 64px;
        width: 100%;
        max-width: 800px;
        max-height: 600px;
        display: flex;
        flex-direction: column;
        border: 1px solid #2A2E39;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }

      .symbol-search-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        border-bottom: 1px solid #2A2E39;
      }

      .symbol-search-header h2 {
        font-size: 15px;
        font-weight: 600;
        color: white;
        margin: 0;
      }

      .symbol-search-close {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: #787B86;
        cursor: pointer;
        transition: all 0.2s;
      }

      .symbol-search-close:hover {
        background: #2A2E39;
        color: white;
      }

      .symbol-search-input-wrapper {
        padding: 12px 20px;
        border-bottom: 1px solid #2A2E39;
        position: relative;
      }

      .search-icon {
        position: absolute;
        left: 32px;
        top: 50%;
        transform: translateY(-50%);
        color: #787B86;
      }

      .symbol-search-input {
        width: 100%;
        background: #131722;
        border: 1px solid #2A2E39;
        border-radius: 4px;
        padding: 10px 16px 10px 40px;
        font-size: 14px;
        color: white;
        outline: none;
        transition: border-color 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .symbol-search-input:focus {
        border-color: #2962FF;
      }

      .symbol-search-categories {
        display: flex;
        gap: 4px;
        padding: 8px 20px;
        border-bottom: 1px solid #2A2E39;
        overflow-x: auto;
      }

      .category-btn {
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
        background: transparent;
        color: #787B86;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .category-btn:hover {
        background: rgba(42, 46, 57, 0.5);
        color: white;
      }

      .category-btn.active {
        background: #2A2E39;
        color: white;
      }

      .symbol-search-list {
        flex: 1;
        overflow-y: auto;
        min-height: 300px;
      }

      .symbol-item {
        width: 100%;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: none;
        border-top: 1px solid #2A2E39;
        background: transparent;
        cursor: pointer;
        transition: background 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .symbol-item:hover {
        background: #2A2E39;
      }

      .symbol-item.active {
        background: rgba(42, 46, 57, 0.5);
      }

      .symbol-item-info {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .symbol-item-icon {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: bold;
        background: #2A2E39;
        color: #787B86;
      }

      .symbol-item.active .symbol-item-icon {
        background: #2962FF;
        color: white;
      }

      .symbol-item-details {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .symbol-item-symbol {
        font-size: 15px;
        font-weight: 600;
        color: white;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .symbol-item.active .symbol-item-symbol {
        color: #2962FF;
      }

      .symbol-item-badge {
        padding: 2px 6px;
        background: #2962FF;
        color: white;
        font-size: 10px;
        font-weight: 500;
        border-radius: 3px;
        text-transform: uppercase;
      }

      .symbol-item-name {
        font-size: 12px;
        color: #787B86;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .symbol-item-arrow {
        width: 20px;
        height: 20px;
        color: #787B86;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .symbol-item.active .symbol-item-arrow {
        color: #2962FF;
        opacity: 1;
      }

      .symbol-search-footer {
        padding: 12px 20px;
        border-top: 1px solid #2A2E39;
        background: #1E222D;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
      }

      .symbol-count {
        color: #787B86;
      }

      .symbol-search-hints {
        display: flex;
        align-items: center;
        gap: 16px;
        color: #787B86;
      }

      .symbol-search-hints kbd {
        padding: 2px 6px;
        background: #2A2E39;
        border-radius: 3px;
        font-size: 11px;
        font-family: monospace;
      }

      .symbol-search-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 0;
        color: #787B86;
      }

      .symbol-search-empty svg {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      .symbol-search-empty p {
        font-size: 14px;
        margin: 0;
      }

      /* Left Toolbar Buttons */
      .toolbar-tool-button {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        color: var(--text-primary);
        transition: background var(--transition-fast);
        position: relative;
      }

      .toolbar-tool-button:hover {
        background: var(--hover-bg-dark);
      }

      .toolbar-tool-button.active {
        background: var(--bg-secondary);
        border-left: 2px solid var(--blue-primary);
      }

      .toolbar-tool-button svg {
        width: 20px;
        height: 20px;
      }

      .toolbar-separator {
        width: 32px;
        height: 1px;
        background: var(--border-primary);
        margin: var(--space-2) 0;
      }

      .toolbar-trash {
        margin-top: auto;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;

    const container = document.createElement('div');
    container.className = 'wrapper';
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="toolbar-button symbol-button" aria-label="Symbol Search">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
              <path fill="currentColor" d="M3.5 8a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM8 2a6 6 0 1 0 3.65 10.76l3.58 3.58 1.06-1.06-3.57-3.57A6 6 0 0 0 8 2Z"></path>
            </svg>
            <span style="text-transform: uppercase;">${this.getAttribute('symbol') || 'SYMBOL'}</span>
          </button>
        </div>

        <div class="separator"></div>

        <div class="toolbar-group interval-dropdown-wrapper">
          <button class="toolbar-button interval-button">D</button>
          <div class="interval-dropdown-menu dropdown-menu">
            <div class="dropdown-item interval-custom-item">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                  <path fill="currentColor" d="M13.9 14.1V22h1.2v-7.9H23v-1.2h-7.9V5h-1.2v7.9H6v1.2h7.9Z"></path>
                </svg>
              </span>
              <span class="dropdown-item-label">Add custom interval…</span>
            </div>
            <div class="dropdown-separator"></div>

            <div class="interval-section" data-section="ticks">
              <div class="interval-section-header">
                Ticks
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
                  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
                </svg>
              </div>
              <div class="interval-section-items">
                <div class="dropdown-item" data-interval="1T">
                  <span class="dropdown-item-label">1 tick</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="10T">
                  <span class="dropdown-item-label">10 ticks</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="100T">
                  <span class="dropdown-item-label">100 ticks</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="1000T">
                  <span class="dropdown-item-label">1000 ticks</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div class="dropdown-separator"></div>

            <div class="interval-section" data-section="seconds">
              <div class="interval-section-header">
                Seconds
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
                  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
                </svg>
              </div>
              <div class="interval-section-items">
                <div class="dropdown-item" data-interval="1S">
                  <span class="dropdown-item-label">1 second</span>
                  <span class="dropdown-item-favorite checked">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="5S">
                  <span class="dropdown-item-label">5 seconds</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="10S">
                  <span class="dropdown-item-label">10 seconds</span>
                  <span class="dropdown-item-favorite checked">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="15S">
                  <span class="dropdown-item-label">15 seconds</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="30S">
                  <span class="dropdown-item-label">30 seconds</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="45S">
                  <span class="dropdown-item-label">45 seconds</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div class="dropdown-separator"></div>

            <div class="interval-section" data-section="minutes">
              <div class="interval-section-header">
                Minutes
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
                  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
                </svg>
              </div>
              <div class="interval-section-items">
                <div class="dropdown-item" data-interval="1">
                  <span class="dropdown-item-label">1 minute</span>
                  <span class="dropdown-item-favorite checked">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="2">
                  <span class="dropdown-item-label">2 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="3">
                  <span class="dropdown-item-label">3 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="4">
                  <span class="dropdown-item-label">4 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="5">
                  <span class="dropdown-item-label">5 minutes</span>
                  <span class="dropdown-item-favorite checked">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="10">
                  <span class="dropdown-item-label">10 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="15">
                  <span class="dropdown-item-label">15 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="30">
                  <span class="dropdown-item-label">30 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="45">
                  <span class="dropdown-item-label">45 minutes</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div class="dropdown-separator"></div>

            <div class="interval-section" data-section="hours">
              <div class="interval-section-header">
                Hours
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
                  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
                </svg>
              </div>
              <div class="interval-section-items">
                <div class="dropdown-item" data-interval="60">
                  <span class="dropdown-item-label">1 hour</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="120">
                  <span class="dropdown-item-label">2 hours</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="180">
                  <span class="dropdown-item-label">3 hours</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="240">
                  <span class="dropdown-item-label">4 hours</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="720">
                  <span class="dropdown-item-label">12 hours</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div class="dropdown-separator"></div>

            <div class="interval-section" data-section="days">
              <div class="interval-section-header">
                Days
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
                  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
                </svg>
              </div>
              <div class="interval-section-items">
                <div class="dropdown-item active" data-interval="1D">
                  <span class="dropdown-item-label">1 day</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="1W">
                  <span class="dropdown-item-label">1 week</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="1M">
                  <span class="dropdown-item-label">1 month</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="3M">
                  <span class="dropdown-item-label">3 months</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="6M">
                  <span class="dropdown-item-label">6 months</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="12M">
                  <span class="dropdown-item-label">12 months</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div class="dropdown-separator"></div>

            <div class="interval-section" data-section="ranges">
              <div class="interval-section-header">
                Ranges
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
                  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
                </svg>
              </div>
              <div class="interval-section-items">
                <div class="dropdown-item" data-interval="1R">
                  <span class="dropdown-item-label">1 range</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="10R">
                  <span class="dropdown-item-label">10 ranges</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="100R">
                  <span class="dropdown-item-label">100 ranges</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
                <div class="dropdown-item" data-interval="1000R">
                  <span class="dropdown-item-label">1000 ranges</span>
                  <span class="dropdown-item-favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="toolbar-group dropdown">
          <button class="toolbar-button chart-style-button icon-only" aria-label="Chart Type">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
              <path fill="currentColor" d="M19 6h-1v7h-3v1h3v8h1v-3h3v-1h-3V6ZM11 7h-1v13H7v1h3v2h1V10h3V9h-3V7Z"></path>
            </svg>
          </button>
          <div class="chart-style-dropdown-menu dropdown-menu">
            <div class="dropdown-item" data-style="bar">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                  <path fill="currentColor" d="M19 6h-1v7h-3v1h3v8h1v-3h3v-1h-3V6ZM11 7h-1v13H7v1h3v2h1V10h3V9h-3V7Z"></path>
                </svg>
              </span>
              <span class="dropdown-item-label">Bars</span>
              <span class="dropdown-item-favorite">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                  <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                </svg>
              </span>
            </div>
            <div class="dropdown-item active" data-style="candlestick">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
                  <path d="M17 11v6h3v-6h-3zm-.5-1h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z"></path>
                  <path d="M18 7h1v3.5h-1zm0 10.5h1V21h-1z"></path>
                  <path d="M9 8v12h3V8H9zm-.5-1h4a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5z"></path>
                  <path d="M10 4h1v3.5h-1zm0 16.5h1V24h-1z"></path>
                </svg>
              </span>
              <span class="dropdown-item-label">Candles</span>
              <span class="dropdown-item-favorite">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                  <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                </svg>
              </span>
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-style="line">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                  <path fill="currentColor" d="m25.39 7.31-8.83 10.92-6.02-5.47-7.16 8.56-.76-.64 7.82-9.36 6 5.45L24.61 6.7l.78.62Z"></path>
                </svg>
              </span>
              <span class="dropdown-item-label">Line</span>
              <span class="dropdown-item-favorite">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                  <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                </svg>
              </span>
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-style="area">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                  <path fill="currentColor" fill-rule="evenodd" d="m25.35 5.35-9.5 9.5-.35.36-.35-.36-4.65-4.64-8.15 8.14-.7-.7 8.5-8.5.35-.36.35.36 4.65 4.64 9.15-9.14.7.7ZM2 21h1v1H2v-1Zm2-1H3v1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1V9h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v1H9v1H8v1H7v1H6v1H5v1H4v1Zm1 0v1H4v-1h1Zm1 0H5v-1h1v1Zm1 0v1H6v-1h1Zm0-1H6v-1h1v1Zm1 0H7v1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v1h1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v1H9v1H8v1H7v1h1v1Zm1 0v1H8v-1h1Zm0-1H8v-1h1v1Zm1 0H9v1h1v1h1v-1h1v1h1v-1h1v1h1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v1H9v1h1v1Zm1 0v1h-1v-1h1Zm0-1v-1h-1v1h1Zm0 0v1h1v1h1v-1h-1v-1h-1Zm6 2v-1h1v1h-1Zm2 0v1h-1v-1h1Zm0-1h-1v-1h1v1Zm1 0h-1v1h1v1h1v-1h1v1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v-1h1v-1h-1v1h-1v1h-1v1h-1v1h1v1Zm1 0h-1v1h1v-1Zm0-1h1v1h-1v-1Zm0-1h1v-1h-1v1Zm0 0v1h-1v-1h1Zm-4 3v1h-1v-1h1Z"></path>
                </svg>
              </span>
              <span class="dropdown-item-label">Area</span>
              <span class="dropdown-item-favorite">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                  <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                </svg>
              </span>
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-style="baseline">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                  <path fill="currentColor" d="m10.49 7.55-.42.7-2.1 3.5.86.5 1.68-2.8 1.8 2.82.84-.54-2.23-3.5-.43-.68Zm12.32 4.72-.84-.54 2.61-4 .84.54-2.61 4Zm-5.3 6.3 1.2-1.84.84.54-1.63 2.5-.43.65-.41-.65-1.6-2.5.85-.54 1.17 1.85ZM4.96 16.75l.86.52-2.4 4-.86-.52 2.4-4ZM3 14v1h1v-1H3Zm2 0h1v1H5v-1Zm2 0v1h1v-1H7Zm2 0h1v1H9v-1Zm2 0v1h1v-1h-1Zm2 0h1v1h-1v-1Zm2 0v1h1v-1h-1Zm2 0h1v1h-1v-1Zm2 0v1h1v-1h-1Zm2 0h1v1h-1v-1Zm2 0v1h1v-1h-1Zm2 0h1v1h-1v-1Z"></path>
                </svg>
              </span>
              <span class="dropdown-item-label">Baseline</span>
              <span class="dropdown-item-favorite">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                  <path stroke="currentColor" d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"></path>
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="toolbar-group dropdown">
          <button class="toolbar-button layout-button icon-only" aria-label="Layout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
              <path fill="currentColor" fill-rule="evenodd" d="M8 7h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM6 8c0-1.1.9-2 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8zm11-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm-2 1c0-1.1.9-2 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8zm-4 8H8a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zm-3-1a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H8zm9 1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm-2 1c0-1.1.9-2 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3z"></path>
            </svg>
          </button>
          <div class="layout-dropdown-menu dropdown-menu">
            <div class="dropdown-item" data-layout="single">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="3" width="18" height="18" rx="1"></rect>
                </svg>
              </span>
              <span class="dropdown-item-label">Single</span>
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-layout="2x1">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="3" width="8" height="18" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="13" y="3" width="8" height="18" rx="1"></rect>
                </svg>
              </span>
              <span class="dropdown-item-label">2 Horizontal</span>
            </div>
            <div class="dropdown-item" data-layout="1x2">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="3" width="18" height="8" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="13" width="18" height="8" rx="1"></rect>
                </svg>
              </span>
              <span class="dropdown-item-label">2 Vertical</span>
            </div>
            <div class="dropdown-item" data-layout="2x2">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="3" width="8" height="8" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="13" y="3" width="8" height="8" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="13" width="8" height="8" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="13" y="13" width="8" height="8" rx="1"></rect>
                </svg>
              </span>
              <span class="dropdown-item-label">2×2 Grid</span>
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-layout="3x1">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="3" width="5" height="18" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="9.5" y="3" width="5" height="18" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="16" y="3" width="5" height="18" rx="1"></rect>
                </svg>
              </span>
              <span class="dropdown-item-label">3 Horizontal</span>
            </div>
            <div class="dropdown-item" data-layout="1x3">
              <span class="dropdown-item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="3" width="18" height="5" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="9.5" width="18" height="5" rx="1"></rect>
                  <rect stroke="currentColor" stroke-width="1.5" x="3" y="16" width="18" height="5" rx="1"></rect>
                </svg>
              </span>
              <span class="dropdown-item-label">3 Vertical</span>
            </div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-button indicators-button" aria-label="Indicators, metrics, and strategies">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
              <path stroke="currentColor" d="M6 12l4.8-4.8a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 0 1.3.1L23 5"></path>
              <path fill="currentColor" fill-rule="evenodd" d="M19 12a1 1 0 0 0-1 1v4h-3v-1a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v2H7a1 1 0 0 0-1 1v4h17V13a1 1 0 0 0-1-1h-3zm0 10h3v-9h-3v9zm-1 0v-4h-3v4h3zm-4-4.5V22h-3v-6h3v1.5zM10 22v-3H7v3h3z"></path>
            </svg>
            <span>Indicators</span>
          </button>
          <button class="toolbar-button favorites-arrow" aria-label="Favorites">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
              <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="indicator-modal">
        <div class="indicator-modal-dialog">
          <div class="indicator-modal-header">
            <div class="indicator-modal-title">Indicators, metrics, and strategies</div>
            <button class="indicator-modal-close" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
                <path stroke="currentColor" stroke-width="1.2" d="m1.5 1.5 15 15m0-15-15 15"></path>
              </svg>
            </button>
          </div>

          <div class="indicator-search-wrapper">
            <div class="indicator-search-container">
              <span class="indicator-search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
                  <path fill="currentColor" d="M12.182 4a8.18 8.18 0 0 1 6.29 13.412l5.526 5.525-1.06 1.06-5.527-5.524A8.182 8.182 0 1 1 12.181 4m0 1.5a6.681 6.681 0 1 0 0 13.363 6.681 6.681 0 0 0 0-13.363"></path>
                </svg>
              </span>
              <input type="text" class="indicator-search" placeholder="Search">
            </div>
          </div>

          <div class="indicator-content">
            <div class="indicator-sidebar">
              <div class="indicator-sidebar-section">
                <div class="indicator-sidebar-title">Personal</div>
                <div class="indicator-sidebar-item active" data-category="favorites">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
                    <path fill-rule="evenodd" d="m17.13 9.74 7.37.9-5.44 5.06L20.4 23 14 19.38 7.6 23l1.34-7.3-5.44-5.06 7.37-.9L14 3l3.13 6.74Zm3.99 2-3.68 3.42.9 4.96L14 17.66l-4.34 2.46.9-4.96-3.68-3.42 5-.6L14 6.56l2.12 4.56 5 .61Z"></path>
                  </svg>
                  <span>Favorites</span>
                </div>
                <div class="indicator-sidebar-item" data-category="myscripts">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="M11 10.5c0-1.02.27-1.89.8-2.5.54-.6 1.39-1 2.7-1 1.31 0 2.16.4 2.7 1 .53.61.8 1.48.8 2.5s-.27 1.89-.8 2.5c-.54.6-1.39 1-2.7 1-1.31 0-2.16-.4-2.7-1a3.75 3.75 0 0 1-.8-2.5zM14.5 6c-1.53 0-2.68.49-3.44 1.34A4.67 4.67 0 0 0 10 10.5c0 1.19.31 2.32 1.06 3.16.76.85 1.91 1.34 3.44 1.34s2.68-.49 3.44-1.34A4.67 4.67 0 0 0 19 10.5c0-1.19-.31-2.32-1.06-3.16C17.18 6.49 16.03 6 14.5 6zM7 23c0-2.4 1.83-5 5-5h5c3.17 0 5 2.6 5 5h1c0-2.85-2.17-6-6-6h-5c-3.83 0-6 3.15-6 6h1z"></path>
                  </svg>
                  <span>My scripts</span>
                </div>
                <div class="indicator-sidebar-item" data-category="inviteonly">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" fill-rule="evenodd" d="M14 5a3 3 0 0 0-3 3v3h6V8a3 3 0 0 0-3-3Zm4 6V8a4 4 0 0 0-8 0v3H8.5A2.5 2.5 0 0 0 6 13.5v7A2.5 2.5 0 0 0 8.5 23h11a2.5 2.5 0 0 0 2.5-2.5v-7a2.5 2.5 0 0 0-2.5-2.5H18Zm-5 5a1 1 0 1 1 2 0v2a1 1 0 1 1-2 0v-2Zm-6-2.5c0-.83.67-1.5 1.5-1.5h11c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-11A1.5 1.5 0 0 1 7 20.5v-7Z"></path>
                  </svg>
                  <span>Invite-only</span>
                </div>
              </div>

              <div class="indicator-sidebar-section">
                <div class="indicator-sidebar-title">Built-In</div>
                <div class="indicator-sidebar-item" data-category="technicals">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" d="m22.85 7.85-4.58 4.59a2.5 2.5 0 0 1-3.54 0l-3.17-3.17a1.5 1.5 0 0 0-2.12 0l-4.59 4.58-.7-.7 4.58-4.59a2.5 2.5 0 0 1 3.54 0l3.17 3.17a1.5 1.5 0 0 0 2.12 0l4.59-4.58.7.7ZM11 22V22h-1V14h1V22Zm12 0V22h-1V14h1V22ZM8 22V22H7V16h1V22Zm6 0V22h-1V16h1V22Zm6 0V22h-1V16h1V22Zm-3 0V22h-1V18h1V22ZM5 22V22H4V19h1V22Z"></path>
                  </svg>
                  <span>Technicals</span>
                </div>
                <div class="indicator-sidebar-item" data-category="financials">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
                    <path fill="currentColor" fill-rule="evenodd" d="M17.5 7H17v6h-3v-3H9v6H5v6h17V7h-4.5Zm.5 14h3V8h-3v13Zm-1 0v-7h-3v7h3Zm-4-7.5V21h-3V11h3v2.5ZM9 21v-4H6v4h3Z"></path>
                  </svg>
                  <span>Financials</span>
                </div>
              </div>

              <div class="indicator-sidebar-section">
                <div class="indicator-sidebar-title">Community</div>
                <div class="indicator-sidebar-item" data-category="editorspicks">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
                    <path fill="currentColor" fill-rule="evenodd" d="M7 6h14v17.015l-7-5.384-7 5.384zm1 1v13.985l6-4.616 6 4.616V7z"></path>
                  </svg>
                  <span>Editors' picks</span>
                </div>
                <div class="indicator-sidebar-item" data-category="top">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
                    <path fill="currentColor" d="M22.003 8v15H5v-4h3.99v-3h3.991v-4h4V8zM6 22h2.99v-2H6zm3.99-5v5h2.991v-5zm3.991-4v9h3v-9zm4-1h.022v10h3V9H17.98zM15 9h-1V6.669l-8.668 7.705-.664-.748L13.247 6H11V5h4z"></path>
                  </svg>
                  <span>Top</span>
                </div>
                <div class="indicator-sidebar-item" data-category="trending">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
                    <path fill="currentColor" fill-rule="evenodd" d="M12.184 2.112a.5.5 0 0 1 .535-.061c1.825.89 3.823 2.451 5.024 4.597 1.112 1.984 1.528 4.446.527 7.265a2.47 2.47 0 0 0 1.614-1.196c.446-.781.545-1.878.143-3.055a.5.5 0 0 1 .822-.52l.088.086c.85.828 1.836 1.79 2.497 3.08.695 1.357 1.016 3.044.556 5.292-.705 3.44-3.17 6.396-6.342 7.378a.5.5 0 0 1-.372-.03c-1.03-.516-1.867-1.085-2.436-1.955-.433-.662-.686-1.461-.788-2.47-.752.68-1.234 1.299-1.54 1.87-.394.736-.512 1.422-.512 2.107a.5.5 0 0 1-.623.485c-3.382-.86-6.083-3.428-7.053-6.987-.693-2.547-.107-5.096 1.087-7.21 1.192-2.11 3.013-3.832 4.87-4.737a.5.5 0 0 1 .664.677c-.631 1.232-.563 1.822-.473 2.057l.01.026c.888-.905 1.43-1.649 1.695-2.48.294-.925.268-2.032-.162-3.707a.5.5 0 0 1 .169-.512m-1.84 7.863h-.002l-.005-.002-.01-.004a1 1 0 0 1-.105-.045 1.3 1.3 0 0 1-.215-.137 1.5 1.5 0 0 1-.468-.643c-.145-.375-.177-.855-.029-1.472a11.3 11.3 0 0 0-3.228 3.608c-1.099 1.945-1.601 4.222-.993 6.455.817 2.998 2.988 5.204 5.745 6.11a5.2 5.2 0 0 1 .596-1.924c.483-.902 1.288-1.828 2.563-2.816a.5.5 0 0 1 .807.39c.011 1.41.253 2.302.677 2.95.399.61.994 1.062 1.865 1.515 2.692-.919 4.841-3.503 5.468-6.56.418-2.04.119-3.495-.466-4.637-.341-.665-.783-1.235-1.266-1.764.02.808-.158 1.57-.526 2.214C20.13 14.305 18.99 15 17.5 15a.5.5 0 0 1-.458-.701c1.253-2.853.895-5.26-.171-7.163-.88-1.57-2.253-2.815-3.647-3.668.22 1.234.2 2.242-.094 3.166-.374 1.176-1.17 2.14-2.281 3.224a.5.5 0 0 1-.503.118z"></path>
                  </svg>
                  <span>Trending</span>
                </div>
              </div>
            </div>

            <div class="indicator-main">
              <div class="indicator-list-header">Available Indicators</div>
              <div class="indicator-list-container">
                <!-- Indicators will be loaded dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="main-content">
        <div class="sidebar-left">
          <!-- Drawing Tools -->
          <button class="toolbar-tool-button active" title="Cursor" aria-label="Cursor tool">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
              <path d="M3.5 3.5l13 6-6 1-1 6-6-13z"/>
            </svg>
          </button>
          <button class="toolbar-tool-button" title="Crosshair" aria-label="Crosshair tool">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
              <path d="M10 1v7M10 12v7M1 10h7M12 10h7M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            </svg>
          </button>
          <button class="toolbar-tool-button" title="Trend Line" aria-label="Trend line tool">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
              <path d="M4 16l12-12"/>
            </svg>
          </button>
          <div class="toolbar-separator"></div>
          <button class="toolbar-tool-button" title="Zoom In" aria-label="Zoom in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
              <path d="M9 3a6 6 0 104.32 10.05l4.58 4.58 1.06-1.06-4.58-4.58A6 6 0 009 3zm0 2a4 4 0 110 8 4 4 0 010-8zM9 6v2H7v2h2v2h2v-2h2V8h-2V6H9z"/>
            </svg>
          </button>
          <button class="toolbar-tool-button" title="Zoom Out" aria-label="Zoom out">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
              <path d="M9 3a6 6 0 104.32 10.05l4.58 4.58 1.06-1.06-4.58-4.58A6 6 0 009 3zm0 2a4 4 0 110 8 4 4 0 010-8zM7 8v2h6V8H7z"/>
            </svg>
          </button>
          <div class="toolbar-separator"></div>
          <button class="toolbar-tool-button toolbar-trash" title="Delete" aria-label="Delete drawings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
              <path d="M8 2h4v2H8V2zM3 5h14v2H3V5zm2 3h10v9a1 1 0 01-1 1H6a1 1 0 01-1-1V8zm3 2v6h2v-6H8zm4 0v6h2v-6h-2z"/>
            </svg>
          </button>
        </div>
        <div class="chart-area">
          <div class="chart-container">
            <div class="chart-legend">
              <div class="legend-titles">
                <span class="legend-symbol">${this.symbol || 'AAPL'}</span>
                <span class="legend-separator">•</span>
                <span class="legend-timeframe">1D</span>
                <span class="legend-separator">•</span>
                <span class="legend-exchange">NASDAQ</span>
              </div>
              <div class="legend-values">
                <span class="legend-value-item">
                  <span class="legend-value-title">O</span>
                  <span class="legend-value-data" data-field="open">—</span>
                </span>
                <span class="legend-value-item">
                  <span class="legend-value-title">H</span>
                  <span class="legend-value-data" data-field="high">—</span>
                </span>
                <span class="legend-value-item">
                  <span class="legend-value-title">L</span>
                  <span class="legend-value-data" data-field="low">—</span>
                </span>
                <span class="legend-value-item">
                  <span class="legend-value-title">C</span>
                  <span class="legend-value-data" data-field="close">—</span>
                </span>
              </div>
            </div>
            <div class="indicators-legend"></div>
          </div>
          <div class="bottom-bar"></div>
        </div>
        <div class="sidebar-right"></div>
      </div>

      <!-- Symbol Search Modal -->
      <div class="symbol-search-modal">
        <div class="symbol-search-content">
          <!-- Header -->
          <div class="symbol-search-header">
            <h2>Symbol Search</h2>
            <button class="symbol-search-close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Search Input -->
          <div class="symbol-search-input-wrapper">
            <svg class="search-icon" width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input type="text" class="symbol-search-input" placeholder="Search symbols..." />
          </div>

          <!-- Categories -->
          <div class="symbol-search-categories">
            <button class="category-btn active" data-category="recent">Recent</button>
            <button class="category-btn" data-category="popular">Popular</button>
            <button class="category-btn" data-category="stocks">Stocks</button>
            <button class="category-btn" data-category="etfs">ETFs</button>
          </div>

          <!-- Symbols List -->
          <div class="symbol-search-list"></div>

          <!-- Footer -->
          <div class="symbol-search-footer">
            <span class="symbol-count">0 symbols found</span>
            <div class="symbol-search-hints">
              <span><kbd>↵</kbd> to select</span>
              <span><kbd>esc</kbd> to close</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.append(style, container);
  }

  /**
   * Format interval for display (e.g., "1" → "1", "60" → "1H", "1D" → "D")
   * @param {string} interval - Interval string
   * @returns {string} Formatted interval
   * @private
   */
  formatIntervalDisplay(interval) {
    if (!interval) return 'D';
    
    // If already formatted with unit, just use the unit part
    if (interval.match(/[HDWMY]$/)) {
      return interval.replace(/^\d+/, '').toUpperCase() || interval;
    }
    
    // Convert numeric minutes to display format
    const minutes = parseInt(interval);
    if (isNaN(minutes)) return interval;
    
    if (minutes >= 1440) {
      const days = minutes / 1440;
      return days === 1 ? 'D' : `${days}D`;
    }
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${hours}H`;
    }
    return `${minutes}`;
  }

  /**
   * Update available intervals based on data provider
   * @param {string} symbol - Symbol to check intervals for
   * @private
   */
  updateAvailableIntervals(symbol) {
    if (!this._dataProvider || typeof this._dataProvider.getAvailableIntervals !== 'function') {
      return;
    }

    const intervalMenu = this.shadowRoot.querySelector('.interval-dropdown-menu');
    if (!intervalMenu) return;

    try {
      const availableIntervals = this._dataProvider.getAvailableIntervals(symbol);
      const baseInterval = this._dataProvider.getBaseInterval(symbol);

      console.log(`Available intervals for ${symbol}:`, availableIntervals);
      console.log(`Base interval: ${baseInterval}`);

      // Auto-update interval to base interval when symbol changes
      if (baseInterval && availableIntervals.includes(baseInterval)) {
        const currentInterval = this.getAttribute('interval');
        if (currentInterval !== baseInterval) {
          this.setAttribute('interval', baseInterval);
          
          // Update interval button text
          const intervalBtn = this.shadowRoot.querySelector('.interval-button');
          if (intervalBtn) {
            intervalBtn.textContent = this.formatIntervalDisplay(baseInterval);
          }
          
          console.log(`✓ Auto-updated interval to base interval: ${baseInterval}`);
        }
      }

      // Define interval hierarchy (in ascending order of duration)
      // Using both minute notation (1, 5, 60, 120) and H/D/W/M/Y notation
      const intervalHierarchy = [
        '1', '5', '15', '30',        // Minutes
        '60', '120', '180', '240', '720',  // Hours (in minutes)
        '1H', '2H', '4H', '12H',     // Hours (H notation)
        '1D',                         // Days
        '1W',                         // Weeks
        '1M', '3M', '6M',            // Months
        '1Y'                          // Years
      ];

      // Get intervals that can be displayed (available + all superior intervals)
      const canDisplay = new Set([...availableIntervals]);

      if (baseInterval) {
        const baseIndex = intervalHierarchy.indexOf(baseInterval);
        if (baseIndex !== -1) {
          // Add all intervals superior to the base interval
          for (let i = baseIndex + 1; i < intervalHierarchy.length; i++) {
            canDisplay.add(intervalHierarchy[i]);
          }
        } else {
          // If base interval not in hierarchy, calculate its duration and add superior intervals
          console.log(`Base interval ${baseInterval} not in hierarchy, calculating superior intervals`);
          const baseMinutes = this.parseIntervalToMinutes(baseInterval);
          console.log(`Base interval ${baseInterval} = ${baseMinutes} minutes`);

          // Add all intervals from hierarchy that are >= base duration
          intervalHierarchy.forEach(interval => {
            const intervalMinutes = this.parseIntervalToMinutes(interval);
            if (intervalMinutes >= baseMinutes) {
              console.log(`  Adding ${interval} (${intervalMinutes} minutes >= ${baseMinutes})`);
              canDisplay.add(interval);
            }
          });
          console.log('Final canDisplay set:', Array.from(canDisplay));
        }
      }

      // Enable/disable interval items based on availability
      intervalMenu.querySelectorAll('.dropdown-item[data-interval]').forEach(item => {
        const interval = item.dataset.interval;

        // Skip tick intervals (most data providers don't support them)
        if (interval.endsWith('T')) {
          item.style.display = 'none';
          return;
        }

        const isAvailable = canDisplay.has(interval);

        if (isAvailable) {
          item.style.display = '';
          item.style.opacity = '1';
          item.style.pointerEvents = 'auto';
        } else {
          item.style.display = 'none'; // Hide unavailable intervals
        }
      });

      // Hide sections that have no visible items
      intervalMenu.querySelectorAll('.interval-section').forEach(section => {
        const visibleItems = section.querySelectorAll('.dropdown-item[data-interval]:not([style*="display: none"])');
        if (visibleItems.length === 0) {
          section.style.display = 'none';
        } else {
          section.style.display = '';
        }
      });

    } catch (error) {
      console.error('Failed to update available intervals:', error);
    }
  }

  /**
   * Parse interval string to minutes for comparison
   * @param {string} interval - Interval string (e.g., '1', '60', '1H', '1D')
   * @returns {number} Duration in minutes
   * @private
   */
  parseIntervalToMinutes(interval) {
    const match = interval.match(/^(\d+)([mHDWMY]?)$/i);
    if (!match) {
      console.warn('Unknown interval format:', interval);
      return 1440; // Default to 1 day
    }

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit.toUpperCase()) {
      case '':      // Minutes (default)
      case 'M':     // Minutes (when lowercase 'm' or when it's just a number)
        // Check if it's actually months (uppercase M without number prefix conflicts)
        if (unit === 'M' && interval.match(/^\d+M$/)) {
          return value * 43200; // Approximate: 30 days
        }
        return value;
      case 'H':     // Hours
        return value * 60;
      case 'D':     // Days
        return value * 1440;
      case 'W':     // Weeks
        return value * 10080;
      case 'Y':     // Years
        return value * 525600; // Approximate: 365 days
      default:
        return 1440;
    }
  }

  /**
   * Parse interval string to milliseconds (for resampling)
   * Delegates to BarResampler's parsing logic
   * 
   * @param {string} interval - Interval string
   * @returns {number} Milliseconds
   * @private
   */
  parseIntervalToMs(interval) {
    const resampler = new BarResampler('dummy', interval);
    return resampler.parseIntervalToMs(interval);
  }

  setupEventListeners() {
    // Interval dropdown
    const intervalBtn = this.shadowRoot.querySelector('.interval-button');
    const intervalMenu = this.shadowRoot.querySelector('.interval-dropdown-menu');

    if (intervalBtn && intervalMenu) {
      intervalBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        if (intervalMenu.classList.contains('show')) {
          intervalMenu.classList.remove('show');
        } else {
          // Position the dropdown
          const btnRect = intervalBtn.getBoundingClientRect();
          intervalMenu.style.top = `${btnRect.bottom}px`;
          intervalMenu.style.left = `${btnRect.left}px`;
          intervalMenu.classList.add('show');
        }
      });

      // Interval section collapse/expand
      this.shadowRoot.querySelectorAll('.interval-section-header').forEach(header => {
        header.addEventListener('click', (e) => {
          e.stopPropagation();
          const section = header.parentElement;
          section.classList.toggle('collapsed');
        });
      });

      // Interval selection
      intervalMenu.querySelectorAll('.dropdown-item[data-interval]').forEach(item => {
        item.addEventListener('click', (e) => {
          // Don't trigger if clicking favorite star
          if (e.target.closest('.dropdown-item-favorite')) {
            return;
          }

          e.stopPropagation();

          // Remove active from all items
          intervalMenu.querySelectorAll('.dropdown-item[data-interval]').forEach(i => {
            i.classList.remove('active');
          });
          item.classList.add('active');

          const interval = item.dataset.interval;

          // Update button text
          let buttonText = interval;
          if (interval === '1D') buttonText = 'D';
          else if (interval === '1W') buttonText = 'W';
          else if (interval === '1M') buttonText = 'M';
          else if (interval.endsWith('M')) buttonText = interval;
          else if (parseInt(interval) >= 60) {
            const hours = parseInt(interval) / 60;
            buttonText = hours + 'H';
          } else {
            buttonText = interval + 'm';
          }
          intervalBtn.textContent = buttonText;

          intervalMenu.classList.remove('show');

          // Fetch data with new interval (with resampling if needed)
          const symbol = this.getAttribute('symbol');
          if (this._dataProvider && symbol) {
            this._dataProvider.fetchHistorical(symbol, interval)
              .then(data => {
                this._data = data;
                this.updateChartType();
              })
              .catch(error => {
                console.error('Failed to load interval data:', error);
              });
          }

          this.dispatchEvent(new CustomEvent('interval-change', {
            detail: { interval },
            bubbles: true,
            composed: true
          }));
        });
      });
    }

    // Chart style dropdown
    const styleBtn = this.shadowRoot.querySelector('.chart-style-button');
    const styleMenu = this.shadowRoot.querySelector('.chart-style-dropdown-menu');

    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (styleMenu.classList.contains('show')) {
        styleMenu.classList.remove('show');
      } else {
        // Position the dropdown
        const btnRect = styleBtn.getBoundingClientRect();
        styleMenu.style.top = `${btnRect.bottom}px`;
        styleMenu.style.left = `${btnRect.left}px`;
        styleMenu.classList.add('show');
      }
    });

    // Close dropdowns when clicking outside
    this.shadowRoot.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown') && !e.target.closest('.interval-dropdown-wrapper')) {
        styleMenu.classList.remove('show');
        if (intervalMenu) {
          intervalMenu.classList.remove('show');
        }
        const layoutMenu = this.shadowRoot.querySelector('.layout-dropdown-menu');
        if (layoutMenu) {
          layoutMenu.classList.remove('show');
        }
      }
    });

    // Chart style items
    styleMenu.querySelectorAll('.dropdown-item[data-style]').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking favorite star
        if (e.target.closest('.dropdown-item-favorite')) {
          return;
        }

        e.stopPropagation();

        styleMenu.querySelectorAll('.dropdown-item').forEach(i => {
          i.classList.remove('active');
        });
        item.classList.add('active');

        const style = item.dataset.style;
        this._currentChartType = style;
        styleMenu.classList.remove('show');

        this.updateChartType();
      });
    });

    // Chart style favorites
    styleMenu.querySelectorAll('.dropdown-item-favorite').forEach(star => {
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        star.classList.toggle('checked');
      });
    });

    // Layout dropdown
    const layoutBtn = this.shadowRoot.querySelector('.layout-button');
    const layoutMenu = this.shadowRoot.querySelector('.layout-dropdown-menu');

    if (layoutBtn && layoutMenu) {
      layoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        if (layoutMenu.classList.contains('show')) {
          layoutMenu.classList.remove('show');
        } else {
          // Close other dropdowns
          styleMenu.classList.remove('show');
          if (intervalMenu) {
            intervalMenu.classList.remove('show');
          }

          // Position the dropdown
          const btnRect = layoutBtn.getBoundingClientRect();
          layoutMenu.style.top = `${btnRect.bottom}px`;
          layoutMenu.style.left = `${btnRect.left}px`;
          layoutMenu.classList.add('show');
        }
      });

      // Layout selection
      layoutMenu.querySelectorAll('.dropdown-item[data-layout]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();

          // Remove active from all items
          layoutMenu.querySelectorAll('.dropdown-item').forEach(i => {
            i.classList.remove('active');
          });
          item.classList.add('active');

          const layout = item.dataset.layout;
          layoutMenu.classList.remove('show');

          // Dispatch custom event that parent can listen to
          this.dispatchEvent(new CustomEvent('layout-change', {
            detail: { layout },
            bubbles: true,
            composed: true
          }));
        });
      });
    }

    // Indicators button - opens modal
    const indicatorsBtn = this.shadowRoot.querySelector('.indicators-button');
    const indicatorModal = this.shadowRoot.querySelector('.indicator-modal');
    const modalClose = this.shadowRoot.querySelector('.indicator-modal-close');

    indicatorsBtn.addEventListener('click', () => {
      indicatorModal.classList.add('show');
    });

    modalClose.addEventListener('click', () => {
      indicatorModal.classList.remove('show');
    });

    // Close modal when clicking outside
    indicatorModal.addEventListener('click', (e) => {
      if (e.target === indicatorModal) {
        indicatorModal.classList.remove('show');
      }
    });

    // Sidebar category items
    this.shadowRoot.querySelectorAll('.indicator-sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.indicator-sidebar-item').forEach(i => {
          i.classList.remove('active');
        });
        item.classList.add('active');

        const category = item.dataset.category;
        console.log('Category selected:', category);
        // In a real implementation, load indicators for this category
      });
    });

    // Indicator search
    const searchInput = this.shadowRoot.querySelector('.indicator-search');
    searchInput.addEventListener('input', (e) => {
      this.searchIndicators(e.target.value);
    });

    // Symbol Search Modal
    this.setupSymbolSearch();

    // Indicator list items - clicking adds indicator
    this.shadowRoot.querySelectorAll('.indicator-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on favorite star or action icons
        if (e.target.closest('.indicator-favorite') || e.target.closest('.indicator-action-icon')) {
          return;
        }

        const indicatorType = item.dataset.indicator;
        console.log('Add indicator:', indicatorType);
        // Close modal after selection
        indicatorModal.classList.remove('show');

        // Dispatch event for external handling if needed
        this.dispatchEvent(new CustomEvent('indicator-selected', {
          detail: { indicator: indicatorType }
        }));
      });
    });

    // Favorite star toggling
    this.shadowRoot.querySelectorAll('.indicator-favorite').forEach(star => {
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        star.classList.toggle('checked');
      });
    });
  }

  searchIndicators(query) {
    const items = this.shadowRoot.querySelectorAll('.indicator-list-item');
    const searchTerm = query.toLowerCase();

    items.forEach(item => {
      const title = item.querySelector('.indicator-list-item-title').textContent.toLowerCase();

      if (title.includes(searchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  setupSymbolSearch() {
    // No hardcoded symbols - will use data provider

    const modal = this.shadowRoot.querySelector('.symbol-search-modal');
    const symbolBtn = this.shadowRoot.querySelector('.symbol-button');
    const closeBtn = this.shadowRoot.querySelector('.symbol-search-close');
    const searchInput = this.shadowRoot.querySelector('.symbol-search-input');
    const symbolList = this.shadowRoot.querySelector('.symbol-search-list');
    const symbolCount = this.shadowRoot.querySelector('.symbol-count');
    const categoryBtns = this.shadowRoot.querySelectorAll('.category-btn');

    let currentCategory = 'recent';
    let recentSymbols = []; // Will be populated from data provider

    // Open modal when clicking symbol button
    symbolBtn.addEventListener('click', () => {
      modal.classList.add('show');
      setTimeout(() => searchInput.focus(), 100);
      renderSymbols();
    });

    // Close modal
    const closeModal = () => {
      modal.classList.remove('show');
      searchInput.value = '';
    };

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Handle Escape key
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter') {
        const firstItem = symbolList.querySelector('.symbol-item');
        if (firstItem) {
          const symbol = firstItem.dataset.symbol;
          selectSymbol(symbol);
        }
      }
    });

    // Category selection
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        renderSymbols();
      });
    });

    // Search input
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderSymbols();
      }, 200);
    });

    // Select symbol
    const selectSymbol = (symbol) => {
      this.setAttribute('symbol', symbol);

      // Add to recent symbols
      recentSymbols = [symbol, ...recentSymbols.filter(s => s !== symbol)].slice(0, 10);

      // Update available intervals for this symbol
      this.updateAvailableIntervals(symbol);

      // Dispatch symbol-change event
      this.dispatchEvent(new CustomEvent('symbol-change', {
        detail: { symbol, interval: '1D' },
        bubbles: true,
        composed: true
      }));

      // Dispatch data-request event (can be prevented for manual handling)
      const dataRequestEvent = new CustomEvent('data-request', {
        detail: { symbol, interval: '1D' },
        bubbles: true,
        composed: true,
        cancelable: true
      });

      this.dispatchEvent(dataRequestEvent);

      // If event not prevented and we have a data provider, use it
      if (!dataRequestEvent.defaultPrevented && this._dataProvider) {
        this._dataProvider.fetchHistorical(symbol, '1D')
          .then(data => {
            this.setData(data);
          })
          .catch(error => {
            console.error('Failed to load symbol data:', error);
          });
      }

      closeModal();
    };

    // Render symbols list
    const renderSymbols = async () => {
      const searchTerm = searchInput.value.toLowerCase();
      let symbols = [];

      // Always use data provider if available
      if (this._dataProvider && typeof this._dataProvider.searchSymbols === 'function') {
        try {
          // Search with current term (or empty for all symbols)
          symbols = await this._dataProvider.searchSymbols(searchTerm);

          // Filter by category if not searching
          if (!searchTerm) {
            if (currentCategory === 'recent' && recentSymbols.length > 0) {
              symbols = symbols.filter(s => recentSymbols.includes(s.symbol));
            }
            // For 'popular' or other categories, show all available symbols
          }
        } catch (error) {
          console.error('Symbol search failed:', error);
          symbols = [];
        }
      } else {
        // No data provider - show message
        symbols = [];
      }

      const currentSymbol = this.getAttribute('symbol');

      if (symbols.length === 0) {
        symbolList.innerHTML = `
          <div class="symbol-search-empty">
            <svg fill="none" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>${searchTerm ? 'No symbols found' : 'No symbols available'}</p>
          </div>
        `;
      } else {
        symbolList.innerHTML = symbols.map(item => {
          const isActive = currentSymbol === item.symbol;
          const name = item.description || item.name || item.symbol;
          const exchange = item.primaryExchange || item.exchange || '';
          return `
            <button class="symbol-item ${isActive ? 'active' : ''}" data-symbol="${item.symbol}">
              <div class="symbol-item-info">
                <div class="symbol-item-icon">${item.symbol.charAt(0)}</div>
                <div class="symbol-item-details">
                  <div class="symbol-item-symbol">
                    ${item.symbol}
                    ${isActive ? '<span class="symbol-item-badge">Active</span>' : ''}
                  </div>
                  <div class="symbol-item-name">
                    <span>${name}</span>
                    ${exchange ? `<span>•</span><span>${exchange}</span>` : ''}
                  </div>
                </div>
              </div>
              <svg class="symbol-item-arrow" fill="none" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          `;
        }).join('');

        // Add click handlers to symbol items
        symbolList.querySelectorAll('.symbol-item').forEach(item => {
          item.addEventListener('click', () => {
            selectSymbol(item.dataset.symbol);
          });
        });
      }

      symbolCount.textContent = `${symbols.length} symbol${symbols.length !== 1 ? 's' : ''} found`;
    };

    // Initial render
    renderSymbols();
  }

  initChart() {
    const container = this.shadowRoot.querySelector('.chart-container');
    const chartOptions = {
      autoSize: true,
      layout: {
        background: { color: this.theme === 'light' ? '#FFFFFF' : '#1E222D' },
        textColor: this.theme === 'light' ? '#191919' : '#D9D9D9',
      },
      grid: {
        vertLines: { color: this.theme === 'light' ? '#E1E3E6' : '#2B2B43' },
        horzLines: { color: this.theme === 'light' ? '#E1E3E6' : '#2B2B43' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: this.theme === 'light' ? '#E1E3E6' : '#2B2B43',
      },
      timeScale: {
        visible: true,
        borderVisible: false,
        borderColor: this.theme === 'light' ? '#E1E3E6' : '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
        rightBarStaysOnScroll: true,
      },
    };

    this.chart = createChart(container, chartOptions);

    // Subscribe to crosshair move to update legend
    this.chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        // Reset to last bar when not hovering
        if (this._data && this._data.length > 0) {
          const lastBar = this._data[this._data.length - 1];
          this.updateLegendValues(lastBar);
        }
        // Reset indicator values
        this.updateIndicatorLegendValues(null);
        return;
      }

      // Update main series legend
      if (this.currentSeries) {
        const data = param.seriesData.get(this.currentSeries);
        if (data) {
          this.updateLegendValues(data);
        }
      }

      // Update indicator legends
      this.updateIndicatorLegendValues(param.seriesData);
    });

    this.dispatchEvent(new CustomEvent('chart-ready', {
      detail: { chart: this.chart }
    }));
  }

  updateChartType() {
    // If this is the control chart (toolbar), update the selected pane chart instead
    let targetChart = this;
    const isControlChart = this.classList.contains('control-chart');

    if (isControlChart) {
      const layout = this.getRootNode().host;
      if (layout && layout.getSelectedChart) {
        targetChart = layout.getSelectedChart();
        if (!targetChart) {
          console.warn('⚠️ No pane chart selected');
          return;
        }
        // Update the target chart's type and trigger its update
        targetChart._currentChartType = this._currentChartType;
        targetChart.updateChartType();

        // Save chart type to configuration (from control chart, we know the selected pane)
        const selectedPaneIndex = layout._selectedPane;
        const paneId = layout.getPaneId(selectedPaneIndex);
        const settings = layout.getPaneSettings(selectedPaneIndex);
        if (settings && paneId !== null) {
          settings.chartType = this._currentChartType;
          layout.saveConfiguration();
          console.log(`[OakView] Saved chart type "${this._currentChartType}" for pane ${selectedPaneIndex}`);
        }
        return;
      }
    }

    // This is a regular pane chart, update it directly
    if (!this.chart || !this._data || this._data.length === 0) {
      console.warn('⚠️ Cannot update chart type - missing chart or data');
      return;
    }

    this.clearSeries();

    switch(this._currentChartType) {
      case 'candlestick':
        this.currentSeries = this.chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350'
        });
        this.currentSeries.setData(this._data);
        break;

      case 'bar':
        this.currentSeries = this.chart.addSeries(BarSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350'
        });
        this.currentSeries.setData(this._data);
        break;

      case 'line':
        const lineData = this._data.map(d => ({ time: d.time, value: d.close }));
        this.currentSeries = this.chart.addSeries(LineSeries, {
          color: '#2962ff',
          lineWidth: 2
        });
        this.currentSeries.setData(lineData);
        break;

      case 'area':
        const areaData = this._data.map(d => ({ time: d.time, value: d.close }));
        this.currentSeries = this.chart.addSeries(AreaSeries, {
          topColor: 'rgba(41, 98, 255, 0.4)',
          bottomColor: 'rgba(41, 98, 255, 0.0)',
          lineColor: 'rgba(41, 98, 255, 1)',
          lineWidth: 2
        });
        this.currentSeries.setData(areaData);
        break;

      case 'baseline':
        const baselineData = this._data.map(d => ({ time: d.time, value: d.close }));
        this.currentSeries = this.chart.addSeries(BaselineSeries, {
          topLineColor: '#26a69a',
          topFillColor1: 'rgba(38, 166, 154, 0.28)',
          topFillColor2: 'rgba(38, 166, 154, 0.05)',
          bottomLineColor: '#ef5350',
          bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
          bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
          lineWidth: 2
        });
        this.currentSeries.setData(baselineData);
        break;

      default:
        // Fallback to candlestick
        this.currentSeries = this.chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350'
        });
        this.currentSeries.setData(this._data);
    }

    this.fitContent();
  }

  updateLegend(symbol, interval, exchange = 'NASDAQ') {
    const legendElement = this.shadowRoot.querySelector('.chart-legend');
    if (!legendElement) return;

    // Update titles
    const symbolEl = legendElement.querySelector('.legend-symbol');
    const timeframeEl = legendElement.querySelector('.legend-timeframe');
    const exchangeEl = legendElement.querySelector('.legend-exchange');

    if (symbolEl && symbol) symbolEl.textContent = symbol;
    if (timeframeEl && interval) timeframeEl.textContent = interval;
    if (exchangeEl) exchangeEl.textContent = exchange;

    // Update OHLC values with the last bar
    if (this._data && this._data.length > 0) {
      const lastBar = this._data[this._data.length - 1];
      this.updateLegendValues(lastBar);
    }
  }

  updateLegendValues(bar) {
    const legendElement = this.shadowRoot.querySelector('.chart-legend');
    if (!legendElement || !bar) return;

    const formatPrice = (price) => {
      if (price === null || price === undefined) return '—';
      return price.toFixed(2);
    };

    const openEl = legendElement.querySelector('[data-field="open"]');
    const highEl = legendElement.querySelector('[data-field="high"]');
    const lowEl = legendElement.querySelector('[data-field="low"]');
    const closeEl = legendElement.querySelector('[data-field="close"]');

    if (openEl) openEl.textContent = formatPrice(bar.open);
    if (highEl) highEl.textContent = formatPrice(bar.high);
    if (lowEl) lowEl.textContent = formatPrice(bar.low);
    if (closeEl) closeEl.textContent = formatPrice(bar.close);

    // Color all OHLC values based on whether it's a bullish or bearish bar
    if (bar.open !== undefined && bar.close !== undefined) {
      const color = bar.close >= bar.open ? '#26a69a' : '#ef5350'; // Green if up, red if down

      if (openEl) openEl.style.color = color;
      if (highEl) highEl.style.color = color;
      if (lowEl) lowEl.style.color = color;
      if (closeEl) closeEl.style.color = color;
    }
  }

  async addIndicatorLegend(indicatorId, metadata) {
    console.log(`[OakView] Adding indicator legend for ${indicatorId}`, metadata);

    // Determine if this is an overlay indicator or separate pane
    const isOverlay = metadata?.overlay !== false; // Default to overlay if not specified
    const paneIndex = isOverlay ? 0 : 1; // Overlay indicators on pane 0, non-overlay on pane 1

    console.log(`[OakView] Indicator ${indicatorId}: overlay=${isOverlay}, paneIndex=${paneIndex}`);

    let legendContainer;

    if (isOverlay) {
      // For overlay indicators, use the shadow root's indicators-legend container
      legendContainer = this.shadowRoot.querySelector('.indicators-legend');

      if (!legendContainer) {
        console.warn(`[OakView] Could not find .indicators-legend in shadow root`);
        return;
      }
    } else {
      // For non-overlay indicators, use the pane's HTML element

      // Wait for pane to be ready (retry up to 10 times with 100ms delay)
      let paneElement = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const panes = this.chart.panes();
        console.log(`[OakView] Available panes (attempt ${attempt + 1}):`, panes?.length || 0);
        console.log(`[OakView] Looking for pane index ${paneIndex}`);

        if (!panes || panes.length <= paneIndex) {
          console.log(`[OakView] Waiting for pane ${paneIndex}... (have ${panes?.length || 0} panes)`);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Log all panes
        panes.forEach((p, idx) => {
          const el = p.getHTMLElement();
          console.log(`[OakView] Pane ${idx}:`, el?.tagName, el?.className);
        });

        const targetPane = panes[paneIndex];
        const trElement = targetPane.getHTMLElement();

        if (trElement) {
          console.log(`[OakView] Pane ${paneIndex} TR element:`, trElement.tagName);

          // Find the TD element inside the TR (the actual pane content container)
          const tdElement = trElement.querySelector('td');
          if (tdElement) {
            console.log(`[OakView] Found TD element inside pane ${paneIndex}`);
            paneElement = tdElement;
            break;
          } else {
            console.log(`[OakView] No TD element found in pane ${paneIndex}, retrying...`);
          }
        }

        console.log(`[OakView] Pane element not ready yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!paneElement) {
        console.warn(`[OakView] Could not get DOM element for pane ${paneIndex} after retries`);
        return;
      }

      // Ensure the TD element has relative positioning for absolute legend positioning
      if (paneElement.style.position !== 'relative' && paneElement.style.position !== 'absolute') {
        paneElement.style.position = 'relative';
      }

      // Find or create legend container for this pane
      legendContainer = paneElement.querySelector('.indicators-legend');

      if (!legendContainer) {
        legendContainer = document.createElement('div');
        legendContainer.className = 'indicators-legend';

        // Style the container - position at top for non-overlay panes
        Object.assign(legendContainer.style, {
          position: 'absolute',
          top: '8px',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: '10',
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });
        paneElement.appendChild(legendContainer);
        console.log(`[OakView] Created legend container in pane ${paneIndex} TD element`);
      }
    }

    // Check if legend already exists
    const existingLegend = legendContainer.querySelector(`[data-indicator-id="${indicatorId}"]`);
    if (existingLegend) return;

    // Get indicator display name
    const displayName = metadata?.shortName || metadata?.title || metadata?.name || indicatorId;

    // Extract parameters from metadata.inputs (OakScript format)
    let paramsStr = '';
    if (metadata?.inputs && Array.isArray(metadata.inputs)) {
      const paramValues = metadata.inputs
        .map(input => {
          if (input.defval !== undefined) {
            return input.defval.toString();
          }
          return null;
        })
        .filter(v => v !== null);

      paramsStr = paramValues.join(', ');
    }

    // Get plot color from metadata
    const plotColor = metadata?.plots?.[0]?.color || '#2196F3';

    // Create legend entry
    const legendItem = document.createElement('div');
    legendItem.className = 'indicator-legend-item';
    legendItem.setAttribute('data-indicator-id', indicatorId);
    legendItem.setAttribute('data-plot-color', plotColor);
    legendItem.setAttribute('data-pane-index', paneIndex.toString());

    // Apply inline styles for the legend item
    Object.assign(legendItem.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px'
    });

    legendItem.innerHTML = `
      <span class="indicator-legend-name" style="font-weight: 500; color: var(--text-primary);">${displayName}</span>
      ${paramsStr ? `<span class="indicator-legend-params" style="color: var(--text-secondary); opacity: 0.8;">${paramsStr}</span>` : ''}
      <span class="indicator-legend-value" data-indicator-value="${indicatorId}" style="color: ${plotColor}; font-weight: 500; font-variant-numeric: tabular-nums;">—</span>
    `;

    legendContainer.appendChild(legendItem);

    console.log(`[OakView] Added indicator legend for ${indicatorId} on pane ${paneIndex} (overlay: ${isOverlay})`);
  }

  removeIndicatorLegend(indicatorId) {
    // Search for the legend across all panes
    const panes = this.chart.panes();
    if (!panes) return;

    for (const pane of panes) {
      const paneElement = pane.element?.();
      if (paneElement) {
        const legendContainer = paneElement.querySelector('.indicators-legend');
        if (legendContainer) {
          const legendItem = legendContainer.querySelector(`[data-indicator-id="${indicatorId}"]`);
          if (legendItem) {
            legendItem.remove();
            return; // Found and removed, no need to search other panes
          }
        }
      }
    }
  }

  updateIndicatorLegendValues(seriesData) {
    if (!this._indicators || this._indicators.length === 0) return;

    // Collect all legend containers to search (shadow root + all panes)
    const legendContainers = [];

    // Add shadow root's indicators-legend container
    const shadowLegendContainer = this.shadowRoot.querySelector('.indicators-legend');
    if (shadowLegendContainer) {
      legendContainers.push(shadowLegendContainer);
    }

    // Add pane legend containers
    const panes = this.chart.panes();
    if (panes) {
      panes.forEach(pane => {
        const trElement = pane.getHTMLElement();
        if (trElement) {
          const tdElement = trElement.querySelector('td');
          if (tdElement) {
            const legendContainer = tdElement.querySelector('.indicators-legend');
            if (legendContainer) {
              legendContainers.push(legendContainer);
            }
          }
        }
      });
    }

    // If seriesData is null, reset all values to dash
    if (!seriesData) {
      legendContainers.forEach(container => {
        container.querySelectorAll('.indicator-legend-value').forEach(el => {
          el.textContent = '—';
        });
      });
      return;
    }

    // Update each indicator's value
    seriesData.forEach((data, series) => {
      // Try to find which indicator this series belongs to
      const seriesIndex = Array.from(seriesData.keys()).indexOf(series);

      // Skip the main series (index 0)
      if (seriesIndex === 0 || !data || typeof data.value !== 'number') return;

      // Find the corresponding indicator (offset by 1 since main series is first)
      const indicatorIndex = seriesIndex - 1;
      if (indicatorIndex < this._indicators.length) {
        const indicator = this._indicators[indicatorIndex];

        // Search for the legend element across all legend containers
        for (const legendContainer of legendContainers) {
          const valueEl = legendContainer.querySelector(`[data-indicator-value="${indicator.id}"]`);
          if (valueEl) {
            valueEl.textContent = data.value.toFixed(2);
            break; // Found it, no need to search other containers
          }
        }
      }
    });
  }

  applyTheme(theme) {
    const isDark = theme === 'dark';
    this.chart.applyOptions({
      layout: {
        background: { color: isDark ? '#1E222D' : '#FFFFFF' },
        textColor: isDark ? '#D9D9D9' : '#191919',
      },
      grid: {
        vertLines: { color: isDark ? '#2B2B43' : '#E1E3E6' },
        horzLines: { color: isDark ? '#2B2B43' : '#E1E3E6' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2B2B43' : '#E1E3E6',
      },
      timeScale: {
        borderColor: isDark ? '#2B2B43' : '#E1E3E6',
      },
    });
  }

  // Public API
  get width() {
    return parseInt(this.getAttribute('width')) || this.clientWidth || 600;
  }

  get height() {
    return parseInt(this.getAttribute('height')) || this.clientHeight || 400;
  }

  get theme() {
    return this.getAttribute('theme') || 'dark';
  }

  /**
   * Get the underlying lightweight-charts instance for full control
   * @returns {IChartApi|null}
   * @public
   * @example
   *   const chart = oakview.getChart();
   *   const series = chart.addSeries(CandlestickSeries, { upColor: '#26a69a' });
   *   series.setData(data);
   */
  getChart() {
    return this.chart;
  }

  /**
   * Set data for the main series (controlled by chart type UI)
   * This updates the current series based on the selected chart type.
   * For advanced use cases, get the chart instance with getChart() and manage series directly.
   * @param {Array} data - Array of OHLCV data
   * @public
   */
  setData(data) {
    this._data = data;
    this.updateChartType();
  }

  /**
   * Clear all indicator series (keeps the main price series)
   * @public
   */
  clearSeries() {
    this.series.forEach(series => {
      this.chart.removeSeries(series);
    });
    this.series.clear();

    if (this.currentSeries) {
      this.chart.removeSeries(this.currentSeries);
      this.currentSeries = null;
    }
  }

  fitContent() {
    if (this.chart) {
      this.chart.timeScale().fitContent();
    }
  }

  applyOptions(options) {
    if (this.chart) {
      this.chart.applyOptions(options);
    }
  }
}

// Register the custom element with an internal name (not for external use)
if (!customElements.get('oakview-internal-chart')) {
  customElements.define('oakview-internal-chart', OakViewChart);
}

// DO NOT export - this is an internal component only used by <oak-view>
// External users should never import or use this class directly
