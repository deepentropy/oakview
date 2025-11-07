import OakViewDataProvider from '../../../src/data-providers/base.js';

/**
 * CSV Data Provider
 *
 * Loads historical data from CSV files.
 * Supports simple file loading for static demos and backtesting.
 *
 * File naming patterns:
 * - Simple: 'data.csv'
 * - With symbol: '{symbol}.csv'
 * - With symbol and interval: '{symbol}_{interval}.csv'
 *
 * CSV Format (header row required):
 * time,open,high,low,close,volume
 * 2024-01-01,100.5,101.2,99.8,100.0,1000000
 *
 * @extends OakViewDataProvider
 */
class CSVDataProvider extends OakViewDataProvider {
  /**
   * @param {Object} config
   * @param {string} [config.baseUrl=''] - Base URL or path for CSV files
   * @param {string} [config.filename] - Static filename (if not using symbol pattern)
   * @param {Function} [config.filePattern] - Custom function: (symbol, interval) => filename
   */
  constructor(config = {}) {
    super();
    this.baseUrl = config.baseUrl || '';
    this.filename = config.filename;
    this.filePattern = config.filePattern || this.defaultFilePattern;
  }

  /**
   * Default file naming pattern
   * @private
   */
  defaultFilePattern(symbol, interval) {
    if (this.filename) {
      return this.filename;
    }
    if (interval) {
      return `${symbol}_${interval}.csv`;
    }
    return `${symbol}.csv`;
  }

  /**
   * Initialize provider (no-op for CSV)
   */
  async initialize(config) {
    // No initialization needed for CSV files
  }

  /**
   * Fetch historical data from CSV file
   * @param {string} symbol - Symbol name
   * @param {string} [interval='1D'] - Timeframe
   * @returns {Promise<Array<OHLCVData>>}
   */
  async fetchHistorical(symbol, interval = '1D', from = null, to = null) {
    const filename = this.filePattern(symbol, interval);
    const url = this.baseUrl + filename;

    console.log('Loading CSV from:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.statusText}`);
      }

      const text = await response.text();
      let data = this.parseCSV(text);

      // Filter by time range if specified
      if (from || to) {
        data = data.filter(item => {
          const time = typeof item.time === 'string'
            ? new Date(item.time).getTime() / 1000
            : item.time;

          if (from && time < from) return false;
          if (to && time > to) return false;
          return true;
        });
      }

      console.log('CSV data loaded:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('Failed to load CSV data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV text into OHLCV data
   * @private
   * @param {string} csvText
   * @returns {Array<OHLCVData>}
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Map common header variations
    const columnMap = {
      time: ['time', 'date', 'timestamp', 'datetime'],
      open: ['open', 'o'],
      high: ['high', 'h'],
      low: ['low', 'l'],
      close: ['close', 'c'],
      volume: ['volume', 'vol', 'v']
    };

    // Find column indices
    const indices = {};
    for (const [key, variations] of Object.entries(columnMap)) {
      const index = headers.findIndex(h => variations.includes(h));
      if (index !== -1) {
        indices[key] = index;
      }
    }

    // Validate required columns
    if (indices.time === undefined) {
      throw new Error('CSV must have a time/date column');
    }
    if (indices.open === undefined || indices.high === undefined ||
        indices.low === undefined || indices.close === undefined) {
      throw new Error('CSV must have open, high, low, close columns');
    }

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = line.split(',');
      if (values.length < headers.length) continue; // Skip invalid rows

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });

      // Build OHLCV object
      const item = {
        time: row[headers[indices.time]],
        open: parseFloat(row[headers[indices.open]]),
        high: parseFloat(row[headers[indices.high]]),
        low: parseFloat(row[headers[indices.low]]),
        close: parseFloat(row[headers[indices.close]])
      };

      // Add volume if available
      if (indices.volume !== undefined) {
        const vol = parseFloat(row[headers[indices.volume]]);
        if (!isNaN(vol) && vol > 0) {
          item.volume = vol;
        }
      }

      // Validate numeric fields
      if (isNaN(item.open) || isNaN(item.high) ||
          isNaN(item.low) || isNaN(item.close)) {
        console.warn('Skipping invalid row:', line);
        continue;
      }

      data.push(item);
    }

    return data;
  }

  /**
   * CSV provider does not support real-time subscriptions
   */
  subscribe(symbol, interval, callback) {
    console.warn('CSVDataProvider does not support real-time subscriptions');
    return () => {}; // No-op unsubscribe
  }
}

export default CSVDataProvider;
