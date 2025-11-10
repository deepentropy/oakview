import { createChart } from 'lightweight-charts';
import './oakview-chart-ui.js';    // Chart with toolbar
import cssVariables from './oakview-variables.css?inline';

/**
 * OakView Chart Layout Component
 * Multi-chart layout with split screen support
 *
 * Usage:
 *   <oakview-chart-layout layout="2x2" symbol="SPX"></oakview-chart-layout>
 *
 * Supported layouts:
 *   - single: 1 chart
 *   - 2x1: 2 charts horizontally
 *   - 1x2: 2 charts vertically
 *   - 2x2: 4 charts in a grid
 *   - 3x1: 3 charts horizontally
 *   - 1x3: 3 charts vertically
 */
class OakViewChartLayout extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._panes = [];
    this._selectedPane = 0;
    this._layoutMode = 'single';
    this._dataProvider = null;
  }

  static get observedAttributes() {
    return ['layout', 'symbol', 'theme', 'data-source'];
  }

  connectedCallback() {
    this.render();
    this.setupPanes();
  }

  disconnectedCallback() {
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

      .chart-pane {
        background: var(--bg-primary);
        position: relative;
        overflow: hidden;
        border: 2px solid transparent;
        transition: border-color var(--transition-normal);
        cursor: pointer;
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
    const controlChart = document.createElement('oakview-chart');
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

      // Create chart element WITHOUT toolbar
      const chart = document.createElement('oakview-chart');
      chart.className = 'pane-chart';
      chart.setAttribute('theme', this.getAttribute('theme') || 'dark');
      chart.setAttribute('show-toolbar', 'false');
      chart.setAttribute('hide-sidebar', 'true'); // Hide left sidebar

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
      paneDiv.addEventListener('click', () => {
        this.selectPane(index);
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

    // Listen for interval changes
    controlChart.addEventListener('interval-change', (e) => {
      const selectedChart = this.getSelectedChart();
      if (selectedChart) {
        // Apply interval change to focused chart
        // This would need to be implemented in the chart component
        this.dispatchEvent(new CustomEvent('interval-change', {
          detail: { interval: e.detail.interval, paneIndex: this._selectedPane }
        }));
      }
    });

    // Listen for layout changes from the control toolbar
    controlChart.addEventListener('layout-change', (e) => {
      this.setLayout(e.detail.layout);
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

    if (controlChart && selectedChart) {
      const symbol = selectedChart.getAttribute('symbol');
      if (symbol) {
        controlChart.setAttribute('symbol', symbol);
      }
    }

    // Dispatch event
    this.dispatchEvent(new CustomEvent('pane-selected', {
      detail: { paneIndex: index, paneId: this._panes[index].id }
    }));
  }

  // Public API

  /**
   * Get the chart element at the specified pane index
   * @param {number} index - Pane index (0-based)
   * @returns {HTMLElement} The oakview-chart element
   */
  getChartAt(index) {
    if (index < 0 || index >= this._panes.length) return null;
    return this._panes[index].chart;
  }

  /**
   * Get all chart elements
   * @returns {Array<HTMLElement>} Array of oakview-chart elements
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
}

// Register the custom element
customElements.define('oakview-chart-layout', OakViewChartLayout);

export default OakViewChartLayout;
