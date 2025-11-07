import { createChart } from 'lightweight-charts';

/**
 * OakView Chart Web Component
 * A custom element wrapper for TradingView's Lightweight Charts
 *
 * Usage:
 *   <oakview-chart width="800" height="400"></oakview-chart>
 *
 * JavaScript API:
 *   const chart = document.querySelector('oakview-chart');
 *   chart.setData([{ time: '2023-01-01', value: 100 }, ...]);
 *   chart.addLineSeries(data, options);
 */
class OakViewChart extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._chart = null;
    this._series = new Map();
  }

  static get observedAttributes() {
    return ['width', 'height', 'theme'];
  }

  connectedCallback() {
    this.render();
    this.initChart();

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

    if ((name === 'width' || name === 'height') && this._chart) {
      this._chart.applyOptions({
        width: this.width,
        height: this.height
      });
    }
  }

  render() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-width: 200px;
        min-height: 200px;
      }

      .chart-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
    `;

    const container = document.createElement('div');
    container.className = 'chart-container';

    this.shadowRoot.append(style, container);
  }

  initChart() {
    const container = this.shadowRoot.querySelector('.chart-container');

    const chartOptions = {
      width: this.width,
      height: this.height,
      layout: {
        background: { color: this.theme === 'light' ? '#FFFFFF' : '#1E222D' },
        textColor: this.theme === 'light' ? '#191919' : '#D9D9D9',
      },
      grid: {
        vertLines: { color: this.theme === 'light' ? '#E1E3E6' : '#2B2B43' },
        horzLines: { color: this.theme === 'light' ? '#E1E3E6' : '#2B2B43' },
      },
      crosshair: {
        mode: 0, // Normal
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

    // Dispatch ready event
    this.dispatchEvent(new CustomEvent('chart-ready', {
      detail: { chart: this._chart }
    }));
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

  /**
   * Get the underlying lightweight-charts instance
   */
  getChart() {
    return this._chart;
  }

  /**
   * Add a candlestick series
   * @param {Array} data - Array of {time, open, high, low, close}
   * @param {Object} options - Series options
   * @returns {Object} The created series
   */
  addCandlestickSeries(data = [], options = {}) {
    const series = this._chart.addCandlestickSeries(options);
    if (data.length > 0) {
      series.setData(data);
    }
    const id = `candlestick-${this._series.size}`;
    this._series.set(id, series);
    return series;
  }

  /**
   * Add a line series
   * @param {Array} data - Array of {time, value}
   * @param {Object} options - Series options
   * @returns {Object} The created series
   */
  addLineSeries(data = [], options = {}) {
    const series = this._chart.addLineSeries(options);
    if (data.length > 0) {
      series.setData(data);
    }
    const id = `line-${this._series.size}`;
    this._series.set(id, series);
    return series;
  }

  /**
   * Add an area series
   * @param {Array} data - Array of {time, value}
   * @param {Object} options - Series options
   * @returns {Object} The created series
   */
  addAreaSeries(data = [], options = {}) {
    const series = this._chart.addAreaSeries(options);
    if (data.length > 0) {
      series.setData(data);
    }
    const id = `area-${this._series.size}`;
    this._series.set(id, series);
    return series;
  }

  /**
   * Add a bar series
   * @param {Array} data - Array of {time, open, high, low, close}
   * @param {Object} options - Series options
   * @returns {Object} The created series
   */
  addBarSeries(data = [], options = {}) {
    const series = this._chart.addBarSeries(options);
    if (data.length > 0) {
      series.setData(data);
    }
    const id = `bar-${this._series.size}`;
    this._series.set(id, series);
    return series;
  }

  /**
   * Add a histogram series
   * @param {Array} data - Array of {time, value, color?}
   * @param {Object} options - Series options
   * @returns {Object} The created series
   */
  addHistogramSeries(data = [], options = {}) {
    const series = this._chart.addHistogramSeries(options);
    if (data.length > 0) {
      series.setData(data);
    }
    const id = `histogram-${this._series.size}`;
    this._series.set(id, series);
    return series;
  }

  /**
   * Remove all series from the chart
   */
  clearSeries() {
    this._series.forEach(series => {
      this._chart.removeSeries(series);
    });
    this._series.clear();
  }

  /**
   * Fit the chart content to the viewport
   */
  fitContent() {
    if (this._chart) {
      this._chart.timeScale().fitContent();
    }
  }

  /**
   * Apply chart options
   * @param {Object} options - Chart options
   */
  applyOptions(options) {
    if (this._chart) {
      this._chart.applyOptions(options);
    }
  }
}

// Register the custom element
customElements.define('oakview-chart', OakViewChart);

export default OakViewChart;
