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
      
      // Preload first file for each symbol to detect intervals
      await this.preloadIntervals();
    } else {
      console.warn('⚠️ No CSV files provided.');
    }
  }

  async preloadIntervals() {
    console.log('🔍 Preloading intervals for all symbols...');
    const promises = [];
    
    for (const [symbol, files] of this.fileInventory.entries()) {
      if (files.length > 0) {
        // Preload first file to detect interval
        const promise = this.fetchHistorical(symbol, null).catch(err => {
          console.warn(`Failed to preload ${symbol}:`, err.message);
        });
        promises.push(promise);
      }
    }
    
    await Promise.all(promises);
    console.log('✓ Intervals preloaded for all symbols');
  }

  buildFileInventory(files) {
    this.fileInventory.clear();

    files.forEach(filename => {
      // Handle formats: SYMBOL_INTERVAL.csv or EXCHANGE_SYMBOL, INTERVAL_HASH.csv
      let symbol;
      
      // Try new format: EXCHANGE_SYMBOL, INTERVAL_HASH.csv
      let match = filename.match(/^([A-Z]+)_([A-Z0-9]+),\s*([^_]+)_[^.]+\.csv$/i);
      if (match) {
        const [, exchange, sym] = match;
        symbol = `${exchange}_${sym}`;
      } else {
        // Try old format: SYMBOL_INTERVAL.csv
        match = filename.match(/^([A-Z0-9_]+)_([^.]+)\.csv$/i);
        if (match) {
          [, symbol] = match;
        }
      }

      if (symbol) {
        if (!this.fileInventory.has(symbol)) {
          this.fileInventory.set(symbol, []);
        }
        // Interval will be detected from data when loaded
        this.fileInventory.get(symbol).push(filename);
      }
    });
  }

  _normalizeInterval(interval) {
    // Map interval formats to standard format
    // 1S -> 1S (1 second)
    // 5 -> 5 (5 minutes) 
    // 1W -> 1W (1 week)
    // 1D -> 1D (1 day)
    // 60 -> 60 (60 minutes)
    
    // Keep interval as-is - OakView handles all formats
    return interval.toUpperCase();
  }

  getBaseInterval(symbol) {
    // Return null - interval will be detected from actual data
    const files = this.fileInventory.get(symbol);
    if (!files || files.length === 0) return null;
    
    // Check cache for first file's detected interval
    const firstFile = files[0];
    for (const [key, value] of this.fileCache.entries()) {
      if (key.startsWith(`${symbol}_`)) {
        return value.detectedInterval;
      }
    }
    
    return null;
  }

  getAvailableIntervals(symbol) {
    // Return detected intervals from cached data
    const files = this.fileInventory.get(symbol) || [];
    const intervals = [];
    
    for (const file of files) {
      for (const [key, value] of this.fileCache.entries()) {
        if (key.includes(file.replace('.csv', ''))) {
          if (value.detectedInterval) {
            intervals.push(value.detectedInterval);
          }
        }
      }
    }
    
    return intervals;
  }

  hasData(symbol, interval) {
    const files = this.fileInventory.get(symbol);
    return files && files.length > 0;
  }

  async fetchHistorical(symbol, interval) {
    console.log(`📥 Fetching ${symbol} @ ${interval}...`);

    // Find matching file for this symbol
    const files = this.fileInventory.get(symbol);
    if (!files || files.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    const matchingFile = files[0]; // Use first file for symbol
    const fileKey = `${symbol}_${matchingFile}`;

    if (this.fileCache.has(fileKey)) {
      const cached = this.fileCache.get(fileKey);
      console.log(`✅ Loaded ${cached.data.length} bars from cache (${cached.detectedInterval})`);
      return cached.data;
    }

    const url = this.baseUrl + matchingFile;
    const result = await this._loadCSV(url);

    this.fileCache.set(fileKey, result);

    console.log(`✅ Loaded ${result.data.length} bars for ${symbol} @ ${result.detectedInterval}`);
    return result.data;
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

            // Auto-detect interval from data
            const detectedInterval = this._detectInterval(data);
            console.log(`🔍 Detected interval: ${detectedInterval}`);

            resolve({ data, detectedInterval });
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

  _detectInterval(data) {
    if (data.length < 2) return null;

    // Calculate time differences between first few bars (sample up to 10)
    const samples = Math.min(10, data.length - 1);
    const diffs = [];
    
    for (let i = 0; i < samples; i++) {
      const diff = data[i + 1].time - data[i].time;
      diffs.push(diff);
    }

    // Get median difference (more robust than average)
    diffs.sort((a, b) => a - b);
    const medianDiff = diffs[Math.floor(diffs.length / 2)];
    
    console.log(`🔍 Time diffs (seconds):`, diffs);
    console.log(`🔍 Median diff: ${medianDiff}s`);

    // Convert to appropriate interval format
    if (medianDiff <= 60) {
      // Seconds (including 60s which is 1 minute, but we keep it as seconds for sub-minute precision)
      return `${medianDiff}s`;
    } else if (medianDiff < 3600) {
      // Minutes
      const minutes = Math.round(medianDiff / 60);
      return `${minutes}`;
    } else if (medianDiff < 86400) {
      // Hours
      const hours = Math.round(medianDiff / 3600);
      return `${hours * 60}`;
    } else if (medianDiff < 604800) {
      // Days
      const days = Math.round(medianDiff / 86400);
      return days === 1 ? '1D' : `${days}D`;
    } else if (medianDiff < 2592000) {
      // Weeks
      const weeks = Math.round(medianDiff / 604800);
      return `${weeks}W`;
    } else {
      // Months
      const months = Math.round(medianDiff / 2592000);
      return `${months}M`;
    }
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
