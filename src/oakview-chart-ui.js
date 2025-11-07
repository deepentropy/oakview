import { createChart } from 'lightweight-charts';

// CSV Loader utility
async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index].trim();
    });

    const item = {
      time: row.time || row.date,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close)
    };

    if (row.volume !== undefined && row.volume !== 'NaN' && row.volume !== '') {
      item.volume = parseFloat(row.volume);
    }

    if (isNaN(item.open) || isNaN(item.high) || isNaN(item.low) || isNaN(item.close)) {
      continue;
    }

    data.push(item);
  }

  return data;
}

/**
 * OakView Chart Web Component with Built-in UI
 * A custom element wrapper for TradingView's Lightweight Charts with toolbar
 *
 * Usage:
 *   <oakview-chart symbol="SPX" data-source="data.csv" show-toolbar="true"></oakview-chart>
 */
class OakViewChart extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._chart = null;
    this._series = new Map();
    this._currentSeries = null;
    this._currentChartType = 'candlestick';
    this._data = [];
    this._allData = [];
    this._currentDataPoints = 365;
  }

  static get observedAttributes() {
    return ['width', 'height', 'theme', 'symbol', 'show-toolbar', 'data-source'];
  }

  async connectedCallback() {
    this.render();
    this.initChart();
    this.setupEventListeners();

    // Load data if data-source is provided
    const dataSource = this.getAttribute('data-source');
    if (dataSource) {
      await this.loadDataFromSource(dataSource);
    }

    // Handle resize
    this._resizeObserver = new ResizeObserver(() => {
      if (this._chart) {
        const container = this.shadowRoot.querySelector('.chart-container');
        this._chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    });

    const container = this.shadowRoot.querySelector('.chart-container');
    this._resizeObserver.observe(container);
  }

  async loadDataFromSource(url) {
    try {
      console.log('Loading data from:', url);
      this._allData = await loadCSV(url);
      console.log('Data loaded:', this._allData.length, 'records');
      this.updateDataSlice();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  updateDataSlice() {
    if (this._allData.length === 0) return;
    this._data = this._allData.slice(-this._currentDataPoints);
    this.updateChartType();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._chart) {
      this._chart.remove();
      this._chart = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'theme' && this._chart) {
      this.applyTheme(newValue);
    }

    if (name === 'symbol') {
      const symbolBtn = this.shadowRoot.querySelector('.symbol-button');
      if (symbolBtn) symbolBtn.textContent = newValue || 'SYMBOL';
    }
  }

  render() {
    const showToolbar = this.getAttribute('show-toolbar') !== 'false';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 400px;
        background: #131722;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
        position: relative;
      }

      .toolbar {
        display: ${showToolbar ? 'flex' : 'none'};
        height: 38px;
        background: #131722;
        border-bottom: 4px solid #2E2E2E;
        align-items: center;
        padding: 0 8px;
        gap: 8px;
        flex-shrink: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .main-content {
        flex: 1;
        display: flex;
        min-height: 0;
      }

      .sidebar-left {
        width: 52px;
        background: #131722;
        border-right: 4px solid #2E2E2E;
        flex-shrink: 0;
      }

      .chart-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .sidebar-right {
        width: 52px;
        background: #131722;
        border-left: 4px solid #2E2E2E;
        flex-shrink: 0;
      }

      .bottom-bar {
        height: 24px;
        background: #131722;
        border-top: 4px solid #2E2E2E;
        flex-shrink: 0;
      }

      .chart-container {
        flex: 1;
        position: relative;
        min-height: 0;
        width: 100%;
        height: 100%;
      }

      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .separator {
        width: 1px;
        height: 24px;
        background: #2a2e39;
        margin: 0 4px;
      }

      .toolbar-button {
        background: transparent;
        border: none;
        color: #dbdbdb;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      }

      .toolbar-button:hover {
        background: #2a2e39;
        color: #dbdbdb;
      }

      .toolbar-button.active {
        background: #2962ff;
        color: #dbdbdb;
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

      .chart-style-button {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .chart-style-button svg {
        width: 28px;
        height: 28px;
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
    `;

    const container = document.createElement('div');
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="toolbar-button symbol-button">${this.getAttribute('symbol') || 'SYMBOL'}</button>
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
          <button class="toolbar-button chart-style-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
              <path d="M17 11v6h3v-6h-3zm-.5-1h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z"></path>
              <path d="M18 7h1v3.5h-1zm0 10.5h1V21h-1z"></path>
              <path d="M9 8v12h3V8H9zm-.5-1h4a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5z"></path>
              <path d="M10 4h1v3.5h-1zm0 16.5h1V24h-1z"></path>
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

        <div class="toolbar-group">
          <button class="toolbar-button indicators-button">
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
              <div class="indicator-list-header">Script name</div>
              <div class="indicator-list-item" data-indicator="ma">
                <span class="indicator-favorite checked">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                    <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z"></path>
                  </svg>
                </span>
                <div class="indicator-list-item-main">
                  <div class="indicator-list-item-title">Moving Average</div>
                </div>
                <div class="indicator-actions">
                  <span class="indicator-action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M.5 9l-.22-.45a.5.5 0 0 0 0 .9L.5 9zm17 0l.22.45a.5.5 0 0 0 0-.9L17.5 9zm-15.66.67l-.22.45.22-.45zM7 2H5.5v1H7V2zM3 4.5v1.15h1V4.5H3zM1.62 7.88l-1.34.67.44.9 1.35-.67-.45-.9zM.28 9.45l1.34.67.45-.9-1.35-.67-.44.9zM3 12.35v1.15h1v-1.15H3zM5.5 16H7v-1H5.5v1zM11 3h1.5V2H11v1zm3 1.5v1.15h1V4.5h-1zm1.93 4.28l1.35.67.44-.9-1.34-.67-.45.9zm1.35-.23l-1.35.67.45.9 1.34-.67-.44-.9zM14 12.35v1.15h1v-1.15h-1zM12.5 15H11v1h1.5v-1zm3.43-5.78A3.5 3.5 0 0 0 14 12.35h1c0-.94.54-1.8 1.38-2.23l-.45-.9zM14 5.65a3.5 3.5 0 0 0 1.93 3.13l.45-.9A2.5 2.5 0 0 1 15 5.65h-1zM12.5 3c.83 0 1.5.67 1.5 1.5h1A2.5 2.5 0 0 0 12.5 2v1zM3 13.5A2.5 2.5 0 0 0 5.5 16v-1A1.5 1.5 0 0 1 4 13.5H3zm-1.38-3.38A2.5 2.5 0 0 1 3 12.35h1a3.5 3.5 0 0 0-1.93-3.13l-.45.9zM3 5.65a2.5 2.5 0 0 1-1.38 2.23l.45.9A3.5 3.5 0 0 0 4 5.65H3zm11 7.85c0 .83-.67 1.5-1.5 1.5v1a2.5 2.5 0 0 0 2.5-2.5h-1zM5.5 2A2.5 2.5 0 0 0 3 4.5h1C4 3.67 4.67 3 5.5 3V2z"></path>
                    </svg>
                  </span>
                </div>
              </div>
              <div class="indicator-list-item" data-indicator="ema">
                <span class="indicator-favorite checked">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                    <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z"></path>
                  </svg>
                </span>
                <div class="indicator-list-item-main">
                  <div class="indicator-list-item-title">EMA - Exponential Moving Average</div>
                </div>
                <div class="indicator-actions">
                  <span class="indicator-action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M.5 9l-.22-.45a.5.5 0 0 0 0 .9L.5 9zm17 0l.22.45a.5.5 0 0 0 0-.9L17.5 9zm-15.66.67l-.22.45.22-.45zM7 2H5.5v1H7V2zM3 4.5v1.15h1V4.5H3zM1.62 7.88l-1.34.67.44.9 1.35-.67-.45-.9zM.28 9.45l1.34.67.45-.9-1.35-.67-.44.9zM3 12.35v1.15h1v-1.15H3zM5.5 16H7v-1H5.5v1zM11 3h1.5V2H11v1zm3 1.5v1.15h1V4.5h-1zm1.93 4.28l1.35.67.44-.9-1.34-.67-.45.9zm1.35-.23l-1.35.67.45.9 1.34-.67-.44-.9zM14 12.35v1.15h1v-1.15h-1zM12.5 15H11v1h1.5v-1zm3.43-5.78A3.5 3.5 0 0 0 14 12.35h1c0-.94.54-1.8 1.38-2.23l-.45-.9zM14 5.65a3.5 3.5 0 0 0 1.93 3.13l.45-.9A2.5 2.5 0 0 1 15 5.65h-1zM12.5 3c.83 0 1.5.67 1.5 1.5h1A2.5 2.5 0 0 0 12.5 2v1zM3 13.5A2.5 2.5 0 0 0 5.5 16v-1A1.5 1.5 0 0 1 4 13.5H3zm-1.38-3.38A2.5 2.5 0 0 1 3 12.35h1a3.5 3.5 0 0 0-1.93-3.13l-.45.9zM3 5.65a2.5 2.5 0 0 1-1.38 2.23l.45.9A3.5 3.5 0 0 0 4 5.65H3zm11 7.85c0 .83-.67 1.5-1.5 1.5v1a2.5 2.5 0 0 0 2.5-2.5h-1zM5.5 2A2.5 2.5 0 0 0 3 4.5h1C4 3.67 4.67 3 5.5 3V2z"></path>
                    </svg>
                  </span>
                </div>
              </div>
              <div class="indicator-list-item" data-indicator="rsi">
                <span class="indicator-favorite">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="currentColor">
                    <path fill-rule="evenodd" d="m12.13 5.74 3.37.9-2.44 2.06L13.9 13 9 10.38 4.1 13l.94-4.3-2.44-2.06 3.37-.9L9 2l3.13 3.74Zm1.99 2-1.68 1.42.4 2.96L9 10.66l-3.84 1.46.4-2.96-1.68-1.42 3-.6L9 4.56l2.12 2.56 3 .61Z"></path>
                  </svg>
                </span>
                <div class="indicator-list-item-main">
                  <div class="indicator-list-item-title">RSI - Relative Strength Index</div>
                </div>
                <div class="indicator-actions">
                  <span class="indicator-action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
                      <path fill="currentColor" d="M.5 9l-.22-.45a.5.5 0 0 0 0 .9L.5 9zm17 0l.22.45a.5.5 0 0 0 0-.9L17.5 9zm-15.66.67l-.22.45.22-.45zM7 2H5.5v1H7V2zM3 4.5v1.15h1V4.5H3zM1.62 7.88l-1.34.67.44.9 1.35-.67-.45-.9zM.28 9.45l1.34.67.45-.9-1.35-.67-.44.9zM3 12.35v1.15h1v-1.15H3zM5.5 16H7v-1H5.5v1zM11 3h1.5V2H11v1zm3 1.5v1.15h1V4.5h-1zm1.93 4.28l1.35.67.44-.9-1.34-.67-.45.9zm1.35-.23l-1.35.67.45.9 1.34-.67-.44-.9zM14 12.35v1.15h1v-1.15h-1zM12.5 15H11v1h1.5v-1zm3.43-5.78A3.5 3.5 0 0 0 14 12.35h1c0-.94.54-1.8 1.38-2.23l-.45-.9zM14 5.65a3.5 3.5 0 0 0 1.93 3.13l.45-.9A2.5 2.5 0 0 1 15 5.65h-1zM12.5 3c.83 0 1.5.67 1.5 1.5h1A2.5 2.5 0 0 0 12.5 2v1zM3 13.5A2.5 2.5 0 0 0 5.5 16v-1A1.5 1.5 0 0 1 4 13.5H3zm-1.38-3.38A2.5 2.5 0 0 1 3 12.35h1a3.5 3.5 0 0 0-1.93-3.13l-.45.9zM3 5.65a2.5 2.5 0 0 1-1.38 2.23l.45.9A3.5 3.5 0 0 0 4 5.65H3zm11 7.85c0 .83-.67 1.5-1.5 1.5v1a2.5 2.5 0 0 0 2.5-2.5h-1zM5.5 2A2.5 2.5 0 0 0 3 4.5h1C4 3.67 4.67 3 5.5 3V2z"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="main-content">
        <div class="sidebar-left"></div>
        <div class="chart-area">
          <div class="chart-container"></div>
          <div class="bottom-bar"></div>
        </div>
        <div class="sidebar-right"></div>
      </div>
    `;

    this.shadowRoot.append(style, container);
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

          // Update data points based on interval
          const numInterval = parseInt(interval);
          if (interval === '1D') {
            this._currentDataPoints = 365;
          } else if (interval === '1W') {
            this._currentDataPoints = 520;
          } else if (interval === '1M') {
            this._currentDataPoints = 365;
          } else if (numInterval >= 60) {
            this._currentDataPoints = 180;
          } else if (numInterval >= 15) {
            this._currentDataPoints = 390;
          } else {
            this._currentDataPoints = 780;
          }

          this.updateDataSlice();
          intervalMenu.classList.remove('show');

          this.dispatchEvent(new CustomEvent('interval-change', {
            detail: { interval }
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

  initChart() {
    const container = this.shadowRoot.querySelector('.chart-container');

    // Get dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    console.log('Chart container size:', width, height);

    const chartOptions = {
      width: width,
      height: height,
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
        borderColor: this.theme === 'light' ? '#E1E3E6' : '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
    };

    this._chart = createChart(container, chartOptions);
    console.log('Chart created:', this._chart);

    this.dispatchEvent(new CustomEvent('chart-ready', {
      detail: { chart: this._chart }
    }));
  }

  updateChartType() {
    if (!this._chart || !this._data || this._data.length === 0) return;

    this.clearSeries();

    switch(this._currentChartType) {
      case 'candlestick':
        this._currentSeries = this._chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350'
        });
        this._currentSeries.setData(this._data);
        break;

      case 'bar':
        this._currentSeries = this._chart.addBarSeries({
          upColor: '#26a69a',
          downColor: '#ef5350'
        });
        this._currentSeries.setData(this._data);
        break;

      case 'line':
        const lineData = this._data.map(d => ({ time: d.time, value: d.close }));
        this._currentSeries = this._chart.addLineSeries({
          color: '#2962ff',
          lineWidth: 2
        });
        this._currentSeries.setData(lineData);
        break;

      case 'area':
        const areaData = this._data.map(d => ({ time: d.time, value: d.close }));
        this._currentSeries = this._chart.addAreaSeries({
          topColor: 'rgba(41, 98, 255, 0.4)',
          bottomColor: 'rgba(41, 98, 255, 0.0)',
          lineColor: 'rgba(41, 98, 255, 1)',
          lineWidth: 2
        });
        this._currentSeries.setData(areaData);
        break;

      case 'baseline':
        const baselineData = this._data.map(d => ({ time: d.time, value: d.close }));
        this._currentSeries = this._chart.addBaselineSeries({
          topLineColor: '#26a69a',
          topFillColor1: 'rgba(38, 166, 154, 0.28)',
          topFillColor2: 'rgba(38, 166, 154, 0.05)',
          bottomLineColor: '#ef5350',
          bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
          bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
          lineWidth: 2
        });
        this._currentSeries.setData(baselineData);
        break;

      default:
        // Fallback to candlestick
        this._currentSeries = this._chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350'
        });
        this._currentSeries.setData(this._data);
    }

    this.fitContent();
  }

  applyTheme(theme) {
    const isDark = theme === 'dark';
    this._chart.applyOptions({
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

  getChart() {
    return this._chart;
  }

  setData(data) {
    this._data = data;
    this.updateChartType();
  }

  addCandlestickSeries(data = [], options = {}) {
    this._data = data;
    this._currentChartType = 'candlestick';
    this.updateChartType();
    return this._currentSeries;
  }

  addLineSeries(data = [], options = {}) {
    const candleData = data.map(d => ({
      time: d.time,
      open: d.value,
      high: d.value,
      low: d.value,
      close: d.value
    }));
    this._data = candleData;
    this._currentChartType = 'line';
    this.updateChartType();
    return this._currentSeries;
  }

  addAreaSeries(data = [], options = {}) {
    const candleData = data.map(d => ({
      time: d.time,
      open: d.value,
      high: d.value,
      low: d.value,
      close: d.value
    }));
    this._data = candleData;
    this._currentChartType = 'area';
    this.updateChartType();
    return this._currentSeries;
  }

  addBarSeries(data = [], options = {}) {
    this._data = data;
    this._currentChartType = 'bar';
    this.updateChartType();
    return this._currentSeries;
  }

  addHistogramSeries(data = [], options = {}) {
    const series = this._chart.addHistogramSeries(options);
    if (data.length > 0) {
      series.setData(data);
    }
    const id = `histogram-${this._series.size}`;
    this._series.set(id, series);
    return series;
  }

  clearSeries() {
    this._series.forEach(series => {
      this._chart.removeSeries(series);
    });
    this._series.clear();

    if (this._currentSeries) {
      this._chart.removeSeries(this._currentSeries);
      this._currentSeries = null;
    }
  }

  fitContent() {
    if (this._chart) {
      this._chart.timeScale().fitContent();
    }
  }

  applyOptions(options) {
    if (this._chart) {
      this._chart.applyOptions(options);
    }
  }
}

customElements.define('oakview-chart', OakViewChart);

export default OakViewChart;
