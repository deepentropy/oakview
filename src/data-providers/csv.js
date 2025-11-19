/**
 * CSV Data Provider for OakView
 * Loads historical OHLCV data from CSV files using PapaParse
 */

import OakViewDataProvider from './base.js';

class CSVDataProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.csvUrl = null;
    this.cachedData = null;
  }

  /**
   * Initialize with CSV file URL
   * @param {Object} config
   * @param {string} config.csvUrl - URL or path to CSV file
   */
  async initialize(config) {
    if (!config || !config.csvUrl) {
      throw new Error('CSVDataProvider requires csvUrl in config');
    }
    this.csvUrl = config.csvUrl;
    console.log(`📊 CSVDataProvider initialized with: ${this.csvUrl}`);
  }

  /**
   * Fetch historical data from CSV file
   * @param {string} symbol - Symbol (ignored for CSV, uses configured file)
   * @param {string} interval - Interval (ignored for CSV)
   * @param {number} from - Optional start timestamp filter
   * @param {number} to - Optional end timestamp filter
   * @returns {Promise<Array>} Array of OHLCV bars
   */
  async fetchHistorical(symbol, interval, from = null, to = null) {
    console.log(`📥 Loading CSV data from: ${this.csvUrl}`);

    // Check if we need to load CSV (only load once)
    if (!this.cachedData) {
      this.cachedData = await this._loadCSV();
    }

    // Filter by time range if specified
    let data = this.cachedData;
    if (from || to) {
      data = data.filter(bar => {
        if (from && bar.time < from) return false;
        if (to && bar.time > to) return false;
        return true;
      });
      console.log(`📊 Filtered ${this.cachedData.length} bars to ${data.length} bars (${from || 'start'} to ${to || 'end'})`);
    }

    console.log(`✅ Loaded ${data.length} bars from CSV`);
    return data;
  }

  /**
   * Load and parse CSV file using PapaParse
   * @private
   * @returns {Promise<Array>} Parsed OHLCV data
   */
  async _loadCSV() {
    return new Promise((resolve, reject) => {
      // Check if PapaParse is available
      if (typeof Papa === 'undefined') {
        reject(new Error('PapaParse library not loaded. Include: <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>'));
        return;
      }

      Papa.parse(this.csvUrl, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data
              .filter(row => row.time && row.close) // Filter out invalid rows
              .map(row => ({
                time: this._parseTime(row.time),
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseFloat(row.Volume || row.volume || 0)
              }))
              .filter(row => !isNaN(row.time) && !isNaN(row.close)); // Filter NaN

            // Sort by time ascending
            data.sort((a, b) => a.time - b.time);

            console.log(`📊 Parsed CSV: ${data.length} bars, timeframe: ${this._formatDate(data[0]?.time)} to ${this._formatDate(data[data.length - 1]?.time)}`);
            resolve(data);
          } catch (error) {
            reject(new Error(`Error parsing CSV data: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`Error loading CSV file: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse time string to Unix timestamp
   * @private
   * @param {string|number} timeValue
   * @returns {number} Unix timestamp in seconds
   */
  _parseTime(timeValue) {
    if (typeof timeValue === 'number') {
      // Already a number - check if it's in seconds or milliseconds
      return timeValue > 10000000000 ? Math.floor(timeValue / 1000) : timeValue;
    }
    
    // Parse date string
    const timestamp = new Date(timeValue).getTime();
    return Math.floor(timestamp / 1000); // Convert to seconds
  }

  /**
   * Format timestamp for display
   * @private
   * @param {number} timestamp - Unix timestamp in seconds
   * @returns {string} Formatted date
   */
  _formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toISOString().split('T')[0];
  }

  /**
   * CSV provider doesn't support real-time data
   */
  subscribe(symbol, interval, callback) {
    console.warn('CSVDataProvider does not support real-time subscriptions');
    return () => {}; // Return no-op unsubscribe
  }

  /**
   * Clear cached data
   */
  disconnect() {
    this.cachedData = null;
    console.log('📊 CSVDataProvider disconnected, cache cleared');
  }
}

export default CSVDataProvider;
