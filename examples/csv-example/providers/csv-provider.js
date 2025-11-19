/**
 * Multi-File CSV Data Provider for OakView
 * 
 * Loads historical data from multiple CSV files with features:
 * - Automatic CSV file discovery
 * - Symbol search from available files
 * - Interval detection and validation
 *
 * File naming pattern: {symbol}_{interval}.csv
 * Example: SPX_1D.csv, QQQ_60.csv (60 = 60 minutes)
 *
 * CSV Format (header row required):
 * time,open,high,low,close,volume
 * 1672531200,100.5,101.2,99.8,100.0,1000000
 */

import { OakViewDataProvider } from '../../../dist/oakview.es.js';

class CSVDataProvider extends OakViewDataProvider {
  /**
   * @param {Object} config
   * @param {string} [config.baseUrl='./data/'] - Base URL or path for CSV files
   * @param {Array<string>} [config.availableFiles] - List of available CSV files
   */
  constructor(config = {}) {
    super();
    this.baseUrl = config.baseUrl || './data/';
    this.availableFiles = config.availableFiles || [];
    this.fileCache = new Map();
    this.fileInventory = new Map();
  }

  async initialize(config) {
    console.log('📊 Initializing CSV provider...');

    if (this.availableFiles.length > 0) {
      this.buildFileInventory(this.availableFiles);
      console.log(`✅ CSV provider initialized with ${this.availableFiles.length} files`);
      console.log('📋 File inventory:', Object.fromEntries(this.fileInventory));
    } else {
      console.warn('⚠️ No CSV files provided.');
    }
  }

  buildFileInventory(files) {
    this.fileInventory.clear();

    files.forEach(filename => {
      const match = filename.match(/^([A-Z0-9]+)_([^.]+)\.csv$/i);
      if (match) {
        const [, symbol, interval] = match;

        if (!this.fileInventory.has(symbol)) {
          this.fileInventory.set(symbol, []);
        }
        this.fileInventory.get(symbol).push(interval);
      }
    });
  }

  getBaseInterval(symbol) {
    const intervals = this.fileInventory.get(symbol);
    return intervals && intervals.length > 0 ? intervals[0] : null;
  }

  getAvailableIntervals(symbol) {
    return this.fileInventory.get(symbol) || [];
  }

  hasData(symbol, interval) {
    const intervals = this.fileInventory.get(symbol);
    return intervals ? intervals.includes(interval) : false;
  }

  async fetchHistorical(symbol, interval) {
    const fileKey = `${symbol}_${interval}`;

    console.log(`📥 Fetching ${symbol} @ ${interval}...`);

    if (this.fileCache.has(fileKey)) {
      console.log(`✅ Loaded ${this.fileCache.get(fileKey).length} bars from cache`);
      return this.fileCache.get(fileKey);
    }

    if (!this.hasData(symbol, interval)) {
      throw new Error(`No data available for ${symbol} at ${interval} interval`);
    }

    const filename = `${symbol}_${interval}.csv`;
    const url = this.baseUrl + filename;
    const data = await this._loadCSV(url);

    this.fileCache.set(fileKey, data);

    console.log(`✅ Loaded ${data.length} bars for ${symbol} @ ${interval}`);
    return data;
  }

  async _loadCSV(url) {
    return new Promise((resolve, reject) => {
      if (typeof Papa === 'undefined') {
        reject(new Error('PapaParse library not loaded'));
        return;
      }

      Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            console.log(`📋 Raw CSV rows: ${results.data.length}`);
            
            // Debug: log first row
            if (results.data.length > 0) {
              console.log('📋 First row:', results.data[0]);
            }

            const data = results.data
              .filter(row => row.time && row.close)
              .map(row => {
                const bar = {
                  time: this._parseTime(row.time),
                  open: parseFloat(row.open),
                  high: parseFloat(row.high),
                  low: parseFloat(row.low),
                  close: parseFloat(row.close),
                  volume: row.volume || row.Volume ? parseFloat(row.volume || row.Volume) : undefined
                };
                return bar;
              })
              .filter(bar => !isNaN(bar.time) && !isNaN(bar.close))
              .sort((a, b) => a.time - b.time);

            console.log(`📊 Parsed ${data.length} valid bars from ${results.data.length} rows`);

            if (data.length === 0) {
              console.error('❌ No valid bars after parsing. Check time and close columns.');
              reject(new Error(`No valid data in: ${url}`));
              return;
            }

            const firstTime = new Date(data[0].time * 1000).toISOString().split('T')[0];
            const lastTime = new Date(data[data.length - 1].time * 1000).toISOString().split('T')[0];
            console.log(`📊 Parsed CSV: ${data.length} bars, ${firstTime} to ${lastTime}`);

            resolve(data);
          } catch (error) {
            console.error('❌ CSV parsing error:', error);
            reject(new Error(`Failed to parse CSV: ${error.message}`));
          }
        },
        error: (error) => {
          console.error('❌ CSV download error:', error);
          reject(new Error(`Failed to load CSV: ${error.message}`));
        }
      });
    });
  }

  _parseTime(timeValue) {
    // If it's a Date object (PapaParse with dynamicTyping can parse dates)
    if (timeValue instanceof Date) {
      return Math.floor(timeValue.getTime() / 1000);
    }

    // If already a number (Unix timestamp)
    if (typeof timeValue === 'number') {
      // Check if milliseconds (> year 2001 in seconds)
      return timeValue > 1000000000 ? timeValue : timeValue;
    }

    // Parse ISO 8601 date string
    if (typeof timeValue === 'string') {
      const date = new Date(timeValue);
      if (isNaN(date.getTime())) {
        return NaN;
      }
      // Return Unix timestamp in seconds
      return Math.floor(date.getTime() / 1000);
    }

    return NaN;
  }

  async searchSymbols(query) {
    const symbols = Array.from(this.fileInventory.keys());
    const filtered = query
      ? symbols.filter(s => s.toLowerCase().includes(query.toLowerCase()))
      : symbols;

    return filtered.map(symbol => ({
      symbol,
      name: symbol,
      description: `${symbol} (CSV Data)`,
      exchange: 'CSV'
    }));
  }

  disconnect() {
    this.fileCache.clear();
    console.log('📊 CSVDataProvider disconnected');
  }
}

export default CSVDataProvider;
