import OakViewDataProvider from '../../../src/data-providers/base.js';

/**
 * Enhanced CSV Data Provider
 *
 * Loads historical data from CSV files with advanced features:
 * - Automatic CSV file discovery
 * - Symbol search from available files
 * - Interval detection and validation
 * - Data resampling for higher timeframes
 *
 * File naming pattern: {symbol}_{interval}.csv
 * Example: SPX_1D.csv, AAPL_1H.csv
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
   * @param {string} [config.baseUrl='./data/'] - Base URL or path for CSV files
   * @param {Array<string>} [config.availableFiles] - List of available CSV files
   */
  constructor(config = {}) {
    super();
    this.baseUrl = config.baseUrl || './data/';
    this.availableFiles = config.availableFiles || [];
    this.fileCache = new Map(); // Cache parsed CSV data
    this.fileInventory = new Map(); // Map of symbol -> available intervals
  }

  /**
   * Initialize provider and discover available CSV files
   */
  async initialize(config) {
    console.log('Initializing CSV provider...');

    // If files list provided, build inventory
    if (this.availableFiles.length > 0) {
      this.buildFileInventory(this.availableFiles);
      console.log('CSV provider initialized with', this.availableFiles.length, 'files');
      console.log('File inventory:', Object.fromEntries(this.fileInventory));
    } else {
      console.warn('No CSV files provided. Use setAvailableFiles() to add files.');
    }
  }

  /**
   * Set available CSV files
   * @param {Array<string>} files - Array of filenames (e.g., ['SPX_1D.csv', 'AAPL_1H.csv'])
   */
  setAvailableFiles(files) {
    this.availableFiles = files;
    this.buildFileInventory(files);
    console.log('Updated file inventory:', Object.fromEntries(this.fileInventory));
  }

  /**
   * Build inventory of available symbols and intervals
   * @private
   */
  buildFileInventory(files) {
    this.fileInventory.clear();

    files.forEach(filename => {
      // Parse filename: {symbol}_{interval}.csv
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

  /**
   * Search for symbols from available CSV files
   * @param {string} query - Search query
   * @returns {Promise<Array<{symbol: string, description: string, intervals: Array<string>}>>}
   */
  async searchSymbols(query = '') {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const [symbol, intervals] of this.fileInventory.entries()) {
      if (!query || symbol.toLowerCase().includes(queryLower)) {
        results.push({
          symbol: symbol,
          description: `${symbol} (${intervals.join(', ')})`,
          intervals: intervals,
          primaryExchange: 'CSV',
          secType: 'historical'
        });
      }
    }

    return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * Get available intervals for a symbol
   * @param {string} symbol
   * @returns {Array<string>}
   */
  getAvailableIntervals(symbol) {
    return this.fileInventory.get(symbol) || [];
  }

  /**
   * Check if symbol and interval combination exists
   * @param {string} symbol
   * @param {string} interval
   * @returns {boolean}
   */
  hasData(symbol, interval) {
    const intervals = this.fileInventory.get(symbol);
    return intervals && intervals.includes(interval);
  }

  /**
   * Get the base interval (smallest available) for a symbol
   * @param {string} symbol
   * @returns {string|null}
   */
  getBaseInterval(symbol) {
    const intervals = this.getAvailableIntervals(symbol);
    if (intervals.length === 0) return null;

    // If only one interval, return it
    if (intervals.length === 1) return intervals[0];

    // Find the smallest interval by comparing durations
    let smallest = intervals[0];
    let smallestMinutes = this.parseIntervalToMinutes(smallest);

    for (const interval of intervals) {
      const minutes = this.parseIntervalToMinutes(interval);
      // Handle special cases for M and Y
      if (typeof minutes === 'string') continue;
      if (typeof smallestMinutes === 'string') {
        smallest = interval;
        smallestMinutes = minutes;
        continue;
      }
      if (minutes < smallestMinutes) {
        smallest = interval;
        smallestMinutes = minutes;
      }
    }

    return smallest;
  }

  /**
   * Fetch historical data from CSV file with resampling support
   * @param {string} symbol - Symbol name
   * @param {string} [interval='1D'] - Timeframe
   * @param {number} [from=null] - Start timestamp
   * @param {number} [to=null] - End timestamp
   * @returns {Promise<Array<OHLCVData>>}
   */
  async fetchHistorical(symbol, interval = '1D', from = null, to = null) {
    // Check if we have this exact file
    if (this.hasData(symbol, interval)) {
      return this.loadCSVFile(symbol, interval, from, to);
    }

    // Try to resample from a lower timeframe
    const baseInterval = this.getBaseInterval(symbol);
    if (!baseInterval) {
      throw new Error(`No data available for symbol: ${symbol}`);
    }

    console.log(`Resampling ${symbol} from ${baseInterval} to ${interval}`);
    const baseData = await this.loadCSVFile(symbol, baseInterval, from, to);
    return this.resampleData(baseData, baseInterval, interval);
  }

  /**
   * Load CSV file and parse data
   * @private
   */
  async loadCSVFile(symbol, interval, from = null, to = null) {
    const filename = `${symbol}_${interval}.csv`;
    const cacheKey = `${symbol}_${interval}`;

    // Check cache
    if (this.fileCache.has(cacheKey)) {
      console.log('Using cached data for:', cacheKey);
      return this.filterByTimeRange(this.fileCache.get(cacheKey), from, to);
    }

    const url = this.baseUrl + filename;
    console.log('Loading CSV from:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.statusText}`);
      }

      const text = await response.text();
      let data = this.parseCSV(text);

      // Cache the data
      this.fileCache.set(cacheKey, data);

      // Filter by time range if specified
      data = this.filterByTimeRange(data, from, to);

      console.log('CSV data loaded:', data.length, 'records');
      return data;
    } catch (error) {
      console.error('Failed to load CSV data:', error);
      throw error;
    }
  }

  /**
   * Filter data by time range
   * @private
   */
  filterByTimeRange(data, from, to) {
    if (!from && !to) return data;

    return data.filter(item => {
      const time = typeof item.time === 'string'
        ? new Date(item.time).getTime() / 1000
        : item.time;

      if (from && time < from) return false;
      if (to && time > to) return false;
      return true;
    });
  }

  /**
   * Resample data to a higher timeframe
   * Supports all timeframes: minutes, hours, days, weeks, months, years
   * @private
   * @param {Array} baseData - Original data
   * @param {string} fromInterval - Source interval
   * @param {string} toInterval - Target interval
   * @returns {Array}
   */
  resampleData(baseData, fromInterval, toInterval) {
    if (baseData.length === 0) {
      return [];
    }

    const toMinutes = this.parseIntervalToMinutes(toInterval);
    const fromMinutes = this.parseIntervalToMinutes(fromInterval);

    // Check if we can resample
    if (toMinutes !== 'M' && toMinutes !== 'Y' && fromMinutes !== 'M' && fromMinutes !== 'Y') {
      if (toMinutes <= fromMinutes) {
        console.warn(`Cannot resample from ${fromInterval} to ${toInterval} (lower timeframe)`);
        return baseData;
      }
    }

    // Handle monthly/yearly resampling differently
    if (toMinutes === 'M' || toMinutes === 'Y') {
      return this.resampleToCalendarPeriod(baseData, toInterval);
    }

    // Handle fixed-duration resampling (minutes, hours, days, weeks)
    return this.resampleToFixedPeriod(baseData, toInterval, toMinutes);
  }

  /**
   * Resample to fixed duration periods (minutes, hours, days, weeks)
   * @private
   */
  resampleToFixedPeriod(baseData, toInterval, intervalMinutes) {
    const resampled = [];
    let currentBar = null;
    let barStartTime = null;

    baseData.forEach(bar => {
      const barTime = typeof bar.time === 'string'
        ? new Date(bar.time).getTime() / 1000
        : bar.time;

      // Determine which resampled bar this belongs to
      const barIndex = Math.floor(barTime / (intervalMinutes * 60));
      const resampledBarStart = barIndex * intervalMinutes * 60;

      if (barStartTime !== resampledBarStart) {
        // Save previous bar
        if (currentBar) {
          resampled.push(currentBar);
        }

        // Start new bar
        barStartTime = resampledBarStart;
        currentBar = {
          time: resampledBarStart,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 0
        };
      } else {
        // Update current bar
        currentBar.high = Math.max(currentBar.high, bar.high);
        currentBar.low = Math.min(currentBar.low, bar.low);
        currentBar.close = bar.close;
        currentBar.volume = (currentBar.volume || 0) + (bar.volume || 0);
      }
    });

    // Add final bar
    if (currentBar) {
      resampled.push(currentBar);
    }

    console.log(`Resampled ${baseData.length} bars to ${resampled.length} bars (${toInterval})`);
    return resampled;
  }

  /**
   * Resample to calendar-based periods (months, years)
   * @private
   */
  resampleToCalendarPeriod(baseData, toInterval) {
    const resampled = [];
    let currentBar = null;
    let currentPeriod = null;

    const isYearly = toInterval.toUpperCase().includes('Y');
    const isMonthly = toInterval.toUpperCase().includes('M');

    // Extract number of months (e.g., "3M" -> 3, "1M" -> 1)
    let monthsPerPeriod = 1;
    if (isMonthly && !isYearly) {
      const match = toInterval.match(/^(\d+)M$/i);
      if (match) {
        monthsPerPeriod = parseInt(match[1]);
      }
    }

    baseData.forEach(bar => {
      const barTime = typeof bar.time === 'string'
        ? new Date(bar.time).getTime() / 1000
        : bar.time;

      const date = new Date(barTime * 1000);

      // Determine period identifier
      let period;
      if (isYearly) {
        period = date.getUTCFullYear();
      } else if (isMonthly) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        // Group months into periods (e.g., 3M: 0-2, 3-5, 6-8, 9-11)
        const periodIndex = Math.floor(month / monthsPerPeriod);
        period = `${year}-${periodIndex}`;
      }

      if (currentPeriod !== period) {
        // Save previous bar
        if (currentBar) {
          resampled.push(currentBar);
        }

        // Start new bar
        currentPeriod = period;

        // Set time to start of period
        let periodStart;
        if (isYearly) {
          periodStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        } else if (isMonthly) {
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const periodIndex = Math.floor(month / monthsPerPeriod);
          const startMonth = periodIndex * monthsPerPeriod;
          periodStart = new Date(Date.UTC(year, startMonth, 1));
        }

        currentBar = {
          time: Math.floor(periodStart.getTime() / 1000),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 0
        };
      } else {
        // Update current bar
        currentBar.high = Math.max(currentBar.high, bar.high);
        currentBar.low = Math.min(currentBar.low, bar.low);
        currentBar.close = bar.close;
        currentBar.volume = (currentBar.volume || 0) + (bar.volume || 0);
      }
    });

    // Add final bar
    if (currentBar) {
      resampled.push(currentBar);
    }

    console.log(`Resampled ${baseData.length} bars to ${resampled.length} bars (${toInterval})`);
    return resampled;
  }

  /**
   * Parse interval string to minutes (or special flag for months)
   * @private
   * @returns {number|string} Minutes as number, or 'M' for monthly intervals
   */
  parseIntervalToMinutes(interval) {
    // Handle month intervals specially (not fixed duration)
    if (interval.match(/^\d*M$/i) && !interval.match(/^\d+$/)) {
      return 'M'; // Return special flag for months
    }

    const match = interval.match(/^(\d+)([mHDWMY]?)$/i);
    if (!match) {
      console.warn('Unknown interval format:', interval);
      return 1440; // Default to 1 day
    }

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit.toUpperCase()) {
      case '': // Minutes (default)
      case 'm': // Minutes (explicit lowercase)
        return value;
      case 'H': // Hours
        return value * 60;
      case 'D': // Days
        return value * 1440;
      case 'W': // Weeks
        return value * 10080;
      case 'M': // Months (return special flag)
        return 'M';
      case 'Y': // Years
        return 'Y';
      default:
        return 1440;
    }
  }

  /**
   * Parse CSV text into OHLCV data
   * @private
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

      // Parse time to Unix timestamp
      const timeString = row[headers[indices.time]];
      let timestamp;

      // Try to parse as Unix timestamp first (if it's just a number)
      if (/^\d+$/.test(timeString)) {
        timestamp = parseInt(timeString);
      } else {
        // Parse as date string and convert to Unix timestamp (seconds)
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date format:', timeString);
          continue;
        }
        timestamp = Math.floor(date.getTime() / 1000);
      }

      // Build OHLCV object
      const item = {
        time: timestamp,
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

  /**
   * Disconnect (cleanup cache)
   */
  disconnect() {
    this.fileCache.clear();
    console.log('CSV provider disconnected, cache cleared');
  }
}

export default CSVDataProvider;
