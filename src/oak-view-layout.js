import { createChart } from 'lightweight-charts';
import './oak-view-chart.js';    // Individual chart component
import cssVariables from './oakview-variables.css?inline';

/**
 * OakView - Multi-pane chart layout component
 * Main entry point for OakView library
 *
 * Usage:
 *   <oak-view layout="single" symbol="SPX" theme="dark"></oak-view>
 *
 * Supported layouts:
 *   - single: 1 chart
 *   - dual: 2 charts horizontally
 *   - triple: 3 charts
 *   - quad: 4 charts in a grid
 */
class OakViewChartLayout extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._panes = [];
    this._selectedPane = 0;
    this._layoutMode = 'single';
    this._dataProvider = null;
    this._expandedPane = null; // Track which pane is expanded
    this._previousLayout = null; // Store layout before expansion
    this._paneSettings = new Map(); // Store per-pane settings (symbol, interval, etc.)
    this._storageKey = 'oakview-layout-config'; // localStorage key
  }

  static get observedAttributes() {
    return ['layout', 'symbol', 'theme', 'data-source'];
  }

  connectedCallback() {
    this.render();
    const hadSavedConfig = this.loadConfiguration(); // Load saved config before setting up panes

    // If we had saved config, apply the layout BEFORE setupPanes
    if (hadSavedConfig && this._layoutMode) {
      // Set the layout attribute (this will be picked up by setupPanes)
      this.setAttribute('layout', this._layoutMode);
    }

    this.setupPanes();

    // Dispatch event so external app knows to load data for restored config
    if (hadSavedConfig) {
      // Use setTimeout to ensure panes are created first
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('config-restored', {
          detail: {
            layout: this._layoutMode,
            panes: Array.from(this._paneSettings.entries()).map(([id, settings]) => ({
              id,
              ...settings
            }))
          }
        }));
      }, 0);
    }
  }

  disconnectedCallback() {
    // Save configuration before cleanup
    this.saveConfiguration();
    // Clean up panes
    this._panes = [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'layout' && this.shadowRoot.querySelector('.layout-container')) {
      this._layoutMode = newValue || 'single';
      this.updateLayout();
    }

    if (name === 'data-source' && this._panes.length > 0) {
      // Update data-source on all pane charts
      this._panes.forEach(pane => {
        if (pane.chart) {
          pane.chart.setAttribute('data-source', newValue);
        }
      });

      // Also update control chart if it exists
      const controlChart = this.shadowRoot?.querySelector('.control-chart');
      if (controlChart) {
        controlChart.setAttribute('data-source', newValue);
      }
    }

    if (name === 'symbol' && this._panes.length > 0) {
      // Update symbol on all pane charts
      this._panes.forEach(pane => {
        if (pane.chart) {
          pane.chart.setAttribute('symbol', newValue);
        }
      });

      // Also update control chart if it exists
      const controlChart = this.shadowRoot?.querySelector('.control-chart');
      if (controlChart) {
        controlChart.setAttribute('symbol', newValue);
      }
    }

    if (name === 'theme' && this._panes.length > 0) {
      // Update theme on all pane charts
      this._panes.forEach(pane => {
        if (pane.chart) {
          pane.chart.setAttribute('theme', newValue);
        }
      });

      // Also update control chart if it exists
      const controlChart = this.shadowRoot?.querySelector('.control-chart');
      if (controlChart) {
        controlChart.setAttribute('theme', newValue);
      }
    }
  }

  // Predefined layouts
  getLayoutConfig(layout) {
    const layouts = {
      single: [{ id: 0 }],
      '2x1': [{ id: 0 }, { id: 1 }],
      '1x2': [{ id: 0 }, { id: 1 }],
      '2x2': [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }],
      '3x1': [{ id: 0 }, { id: 1 }, { id: 2 }],
      '1x3': [{ id: 0 }, { id: 1 }, { id: 2 }]
    };
    return layouts[layout] || layouts.single;
  }

  getGridClass(layout) {
    switch (layout) {
      case '2x1': return 'grid-2x1';
      case '1x2': return 'grid-1x2';
      case '2x2': return 'grid-2x2';
      case '3x1': return 'grid-3x1';
      case '1x3': return 'grid-1x3';
      default: return 'grid-single';
    }
  }

  render() {
    const style = document.createElement('style');
    style.textContent = `
      ${cssVariables}

      :host {
        display: block;
        width: 100%;
        height: 100%;
        background: var(--bg-primary);
        display: flex;
        flex-direction: column;
      }

      .layout-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .toolbar-container {
        flex-shrink: 0;
      }

      .main-layout {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .sidebar-left {
        width: var(--toolbar-width);
        background: var(--bg-primary);
        border-right: 1px solid var(--border-primary);
        flex-shrink: 0;
      }

      .center-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .layout-container {
        flex: 1;
        display: grid;
        gap: 1px;
        background: #1a1e2e;
        overflow: hidden;
      }

      .bottom-bar {
        height: var(--bottom-bar-height);
        background: var(--bg-primary);
        border-top: 1px solid var(--border-primary);
        flex-shrink: 0;
      }

      .sidebar-right {
        width: var(--toolbar-width);
        background: var(--bg-primary);
        border-left: 1px solid var(--border-primary);
        flex-shrink: 0;
      }

      /* Single chart */
      .grid-single {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
      }

      /* 2 charts horizontal */
      .grid-2x1 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
      }

      /* 2 charts vertical */
      .grid-1x2 {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }

      /* 4 charts grid */
      .grid-2x2 {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }

      /* 3 charts horizontal */
      .grid-3x1 {
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1fr;
      }

      /* 3 charts vertical */
      .grid-1x3 {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr 1fr;
      }

      /* Expanded state - single pane takes full space */
      .grid-expanded {
        grid-template-columns: 1fr !important;
        grid-template-rows: 1fr !important;
      }

      .chart-pane {
        background: var(--bg-primary);
        position: relative;
        overflow: hidden;
        border: 2px solid transparent;
        transition: border-color var(--transition-normal);
        cursor: pointer;
      }

      .chart-pane.hidden {
        display: none;
      }

      .chart-pane:hover {
        border-color: var(--bg-secondary);
      }

      .chart-pane.selected {
        border-color: var(--blue-primary) !important;
      }

      /* Pane charts fill their containers */
      .pane-chart {
        width: 100%;
        height: 100%;
        min-height: 0 !important; /* Override default min-height */
      }

      /* Style for control chart - only show toolbar, hide chart area */
      .control-chart {
        min-height: 0 !important;
        height: calc(var(--navbar-height) + 1px) !important; /* navbar height + border */
        max-height: calc(var(--navbar-height) + 1px) !important;
        overflow: hidden !important;
      }
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'layout-wrapper';

    // Create a single toolbar container at the top
    const toolbarContainer = document.createElement('div');
    toolbarContainer.className = 'toolbar-container';

    // Create a single chart with toolbar for controls (no data loading)
    const controlChart = document.createElement('oakview-internal-chart');
    controlChart.className = 'control-chart';
    controlChart.setAttribute('theme', this.getAttribute('theme') || 'dark');
    controlChart.setAttribute('show-toolbar', 'true');
    controlChart.setAttribute('symbol', this.getAttribute('symbol') || 'SYMBOL');
    controlChart.setAttribute('hide-sidebar', 'true');

    toolbarContainer.appendChild(controlChart);

    // Create main layout with sidebars
    const mainLayout = document.createElement('div');
    mainLayout.className = 'main-layout';

    // Left sidebar
    const sidebarLeft = document.createElement('div');
    sidebarLeft.className = 'sidebar-left';

    // Center area with charts and bottom bar
    const centerArea = document.createElement('div');
    centerArea.className = 'center-area';

    const layoutContainer = document.createElement('div');
    layoutContainer.className = 'layout-container';

    const bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';

    centerArea.appendChild(layoutContainer);
    centerArea.appendChild(bottomBar);

    // Right sidebar
    const sidebarRight = document.createElement('div');
    sidebarRight.className = 'sidebar-right';

    mainLayout.appendChild(sidebarLeft);
    mainLayout.appendChild(centerArea);
    mainLayout.appendChild(sidebarRight);

    wrapper.appendChild(toolbarContainer);
    wrapper.appendChild(mainLayout);

    this.shadowRoot.append(style, wrapper);
  }

  setupPanes() {
    const layoutAttr = this.getAttribute('layout') || 'single';
    this._layoutMode = layoutAttr;
    this.updateLayout();
  }

  updateLayout() {
    const container = this.shadowRoot.querySelector('.layout-container');
    if (!container) return;

    // Clear existing panes
    container.innerHTML = '';
    container.className = `layout-container ${this.getGridClass(this._layoutMode)}`;

    // Get pane configuration
    const paneConfigs = this.getLayoutConfig(this._layoutMode);
    this._panes = [];

    // Create panes
    paneConfigs.forEach((config, index) => {
      const paneDiv = document.createElement('div');
      paneDiv.className = `chart-pane ${index === this._selectedPane ? 'selected' : ''}`;
      paneDiv.dataset.paneId = config.id;

      // Get or initialize settings for this pane
      const paneId = config.id;
      if (!this._paneSettings.has(paneId)) {
        // Initialize with default settings from layout attributes
        this._paneSettings.set(paneId, {
          symbol: this.getAttribute('symbol') || 'SYMBOL',
          interval: '1D', // Default interval
        });
      }
      const settings = this._paneSettings.get(paneId);

      // Create chart element WITHOUT toolbar
      const chart = document.createElement('oakview-internal-chart');
      chart.className = 'pane-chart';
      chart.setAttribute('theme', this.getAttribute('theme') || 'dark');
      chart.setAttribute('show-toolbar', 'false');
      chart.setAttribute('hide-sidebar', 'true'); // Hide left sidebar
      chart.setAttribute('symbol', settings.symbol); // Set pane-specific symbol

      const dataSource = this.getAttribute('data-source');
      if (dataSource) {
        chart.setAttribute('data-source', dataSource);
      }

      // Configure chart scales
      chart.addEventListener('chart-ready', () => {
        const lwChart = chart.getChart();
        if (lwChart) {
          lwChart.applyOptions({
            timeScale: {
              visible: true, // Show time scale on all charts
              borderVisible: false,
              timeVisible: true,
              secondsVisible: false,
              rightBarStaysOnScroll: true,
            },
            rightPriceScale: {
              visible: true, // Show price scale on right
              borderVisible: false,
            },
            leftPriceScale: {
              visible: false, // Left scale typically for indicators
            },
          });
        }
      }, { once: true });

      // Click handler to select pane
      paneDiv.addEventListener('click', (e) => {
        // Alt+Left-Click handler to expand/collapse pane
        if (e.altKey) {
          e.preventDefault();
          this.togglePaneExpansion(index);
        } else {
          this.selectPane(index);
        }
      });

      paneDiv.appendChild(chart);
      container.appendChild(paneDiv);

      this._panes.push({
        element: paneDiv,
        chart: chart,
        id: config.id
      });
    });

    // Setup control chart listeners
    this.setupControlChartListeners();
  }

  setupControlChartListeners() {
    const controlChart = this.shadowRoot.querySelector('.control-chart');
    if (!controlChart) return;

    // Listen for symbol changes
    controlChart.addEventListener('symbol-change', (e) => {
      const selectedChart = this.getSelectedChart();
      if (selectedChart && this._panes.length > 0 && this._selectedPane < this._panes.length) {
        const paneId = this._panes[this._selectedPane].id;

        // Update stored settings for this pane
        const settings = this._paneSettings.get(paneId);
        if (settings) {
          settings.symbol = e.detail.symbol;
          // Save configuration after symbol change
          this.saveConfiguration();
        }

        // Update the chart's symbol attribute
        selectedChart.setAttribute('symbol', e.detail.symbol);

        // Dispatch event for external app to load new data
        this.dispatchEvent(new CustomEvent('symbol-change', {
          detail: {
            symbol: e.detail.symbol,
            paneIndex: this._selectedPane,
            paneId: paneId
          }
        }));
      }
    });

    // Listen for interval changes
    controlChart.addEventListener('interval-change', (e) => {
      const selectedChart = this.getSelectedChart();
      if (selectedChart && this._panes.length > 0 && this._selectedPane < this._panes.length) {
        const paneId = this._panes[this._selectedPane].id;

        // Update stored settings for this pane
        const settings = this._paneSettings.get(paneId);
        if (settings) {
          settings.interval = e.detail.interval;
          // Save configuration after interval change
          this.saveConfiguration();
        }

        // Dispatch event for external app to load new data
        this.dispatchEvent(new CustomEvent('interval-change', {
          detail: {
            interval: e.detail.interval,
            paneIndex: this._selectedPane,
            paneId: paneId,
            symbol: settings?.symbol
          }
        }));
      }
    });

    // Listen for layout changes from the control toolbar
    controlChart.addEventListener('layout-change', (e) => {
      this.setLayout(e.detail.layout);
      // Save configuration after layout change
      this.saveConfiguration();
    });

    // Listen for other control events and forward to selected chart
    controlChart.addEventListener('chart-style-change', (e) => {
      const selectedChart = this.getSelectedChart();
      if (selectedChart) {
        this.dispatchEvent(new CustomEvent('chart-style-change', {
          detail: { ...e.detail, paneIndex: this._selectedPane }
        }));
      }
    });
  }

  getSelectedChart() {
    if (this._selectedPane >= 0 && this._selectedPane < this._panes.length) {
      return this._panes[this._selectedPane].chart;
    }
    return null;
  }

  selectPane(index) {
    if (index < 0 || index >= this._panes.length) return;

    // Deselect all panes
    this._panes.forEach((pane, i) => {
      if (i === index) {
        pane.element.classList.add('selected');
      } else {
        pane.element.classList.remove('selected');
      }
    });

    this._selectedPane = index;

    // Update control chart to reflect focused chart's properties
    const selectedChart = this._panes[index].chart;
    const controlChart = this.shadowRoot.querySelector('.control-chart');
    const paneId = this._panes[index].id;
    const settings = this._paneSettings.get(paneId);

    if (controlChart && selectedChart && settings) {
      // Update control chart to show the selected pane's symbol
      controlChart.setAttribute('symbol', settings.symbol);

      // Note: We could also update interval display here if the control chart
      // had a way to display/set the current interval
    }

    // Dispatch event
    this.dispatchEvent(new CustomEvent('pane-selected', {
      detail: {
        paneIndex: index,
        paneId: paneId,
        symbol: settings?.symbol,
        interval: settings?.interval
      }
    }));
  }

  togglePaneExpansion(index) {
    if (index < 0 || index >= this._panes.length) return;

    const container = this.shadowRoot.querySelector('.layout-container');
    if (!container) return;

    // Check if we're currently in single layout mode
    if (this._layoutMode === 'single') return;

    // If a pane is already expanded
    if (this._expandedPane !== null) {
      // If clicking the same pane, collapse it
      if (this._expandedPane === index) {
        // Show all panes again
        this._panes.forEach(pane => {
          pane.element.classList.remove('hidden');
        });

        // Remove expanded grid class
        container.classList.remove('grid-expanded');

        // Restore previous layout
        this._expandedPane = null;
      } else {
        // Clicking a different pane while expanded - switch to that pane
        // Hide all panes except the new one
        this._panes.forEach((pane, i) => {
          if (i === index) {
            pane.element.classList.remove('hidden');
          } else {
            pane.element.classList.add('hidden');
          }
        });

        // Update expanded pane
        this._expandedPane = index;
        this.selectPane(index);
      }
    } else {
      // No pane is expanded - expand the clicked pane
      // Hide all panes except the clicked one
      this._panes.forEach((pane, i) => {
        if (i === index) {
          pane.element.classList.remove('hidden');
        } else {
          pane.element.classList.add('hidden');
        }
      });

      // Add expanded grid class to make the visible pane take full space
      container.classList.add('grid-expanded');

      // Track which pane is expanded
      this._expandedPane = index;
      this.selectPane(index);
    }
  }

  // Public API

  /**
   * Get the chart element at the specified pane index
   * @param {number} index - Pane index (0-based)
   * @returns {HTMLElement} The internal chart element
   */
  getChartAt(index) {
    if (index < 0 || index >= this._panes.length) return null;
    return this._panes[index].chart;
  }

  /**
   * Get all chart elements
   * @returns {Array<HTMLElement>} Array of internal chart elements
   */
  getAllCharts() {
    return this._panes.map(pane => pane.chart);
  }

  /**
   * Get the number of chart panes
   * @returns {number} Number of chart panes
   */
  getChartCount() {
    return this._panes.length;
  }

  /**
   * Change the layout mode
   * @param {string} layout - Layout mode (single, 2x1, 1x2, 2x2, 3x1, 1x3)
   */
  setLayout(layout) {
    this.setAttribute('layout', layout);
  }

  /**
   * Get current layout mode
   * @returns {string} Current layout mode
   */
  getLayout() {
    return this._layoutMode;
  }

  /**
   * Get settings for a specific pane
   * @param {number} index - Pane index (0-based)
   * @returns {Object|null} Settings object with symbol and interval, or null if invalid index
   */
  getPaneSettings(index) {
    if (index < 0 || index >= this._panes.length) return null;
    const paneId = this._panes[index].id;
    return this._paneSettings.get(paneId);
  }

  /**
   * Get the pane ID for a given index
   * @param {number} index - Pane index (0-based)
   * @returns {number|null} Pane ID or null if invalid index
   */
  getPaneId(index) {
    if (index < 0 || index >= this._panes.length) return null;
    return this._panes[index].id;
  }

  /**
   * Set a data provider for all charts in the layout
   * @param {OakViewDataProvider} provider - Data provider instance
   * @public
   */
  setDataProvider(provider) {
    this._dataProvider = provider;

    // Propagate to control chart
    const controlChart = this.shadowRoot.querySelector('.control-chart');
    if (controlChart) {
      controlChart.setDataProvider(provider);
    }

    // Propagate to all pane charts
    this._panes.forEach(pane => {
      if (pane.chart) {
        pane.chart.setDataProvider(provider);
      }
    });
  }

  /**
   * Get the current data provider
   * @returns {OakViewDataProvider|null}
   * @public
   */
  getDataProvider() {
    return this._dataProvider;
  }

  // ============================================================================
  // Configuration Storage
  // ============================================================================

  /**
   * Load configuration from localStorage
   * @private
   * @returns {boolean} True if configuration was loaded
   */
  loadConfiguration() {
    try {
      const savedConfig = localStorage.getItem(this._storageKey);
      if (!savedConfig) return false;

      const config = JSON.parse(savedConfig);
      console.log('[OakView] Loading saved configuration:', config);

      // Restore layout mode
      if (config.layout) {
        this._layoutMode = config.layout;
      }

      // Restore pane settings
      if (config.panes) {
        config.panes.forEach(paneConfig => {
          this._paneSettings.set(paneConfig.id, {
            symbol: paneConfig.symbol,
            interval: paneConfig.interval,
            chartType: paneConfig.chartType || 'candlestick',
            indicators: paneConfig.indicators || []
          });
        });
      }

      console.log('[OakView] Configuration loaded successfully');
      return true;
    } catch (error) {
      console.error('[OakView] Failed to load configuration:', error);
      return false;
    }
  }

  /**
   * Save configuration to localStorage
   * @private
   */
  saveConfiguration() {
    try {
      const config = {
        layout: this._layoutMode,
        panes: []
      };

      // Save each pane's settings
      this._paneSettings.forEach((settings, paneId) => {
        config.panes.push({
          id: paneId,
          symbol: settings.symbol,
          interval: settings.interval,
          chartType: settings.chartType,
          indicators: settings.indicators || []
        });
      });

      localStorage.setItem(this._storageKey, JSON.stringify(config));
      console.log('[OakView] Configuration saved:', config);
    } catch (error) {
      console.error('[OakView] Failed to save configuration:', error);
    }
  }

  /**
   * Update pane configuration and save
   * @param {number} paneId - Pane ID
   * @param {Object} updates - Settings to update
   * @public
   */
  updatePaneConfig(paneId, updates) {
    const settings = this._paneSettings.get(paneId);
    if (settings) {
      Object.assign(settings, updates);
      this.saveConfiguration();
    }
  }

  /**
   * Clear all saved configuration
   * @public
   */
  clearConfiguration() {
    localStorage.removeItem(this._storageKey);
    console.log('[OakView] Configuration cleared');
  }
}

// Register custom element
if (!customElements.get('oak-view')) {
  customElements.define('oak-view', OakViewChartLayout);
}

export default OakViewChartLayout;
