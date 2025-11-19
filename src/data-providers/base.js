/**
 * OakView Data Provider Base Class
 *
 * This is the base interface that all data providers must implement.
 * Data providers handle fetching historical data and streaming real-time updates.
 *
 * REQUIRED METHODS (must implement):
 * - initialize(config): Setup provider
 * - fetchHistorical(symbol, interval, from, to): Load historical data
 *
 * OPTIONAL METHODS (implement for enhanced functionality):
 * - subscribe(symbol, interval, callback): Real-time updates
 * - searchSymbols(query): Symbol search
 * - getAvailableIntervals(symbol): List available timeframes
 * - getBaseInterval(symbol): Get native timeframe
 * - hasData(symbol, interval): Check if data exists
 * - disconnect(): Cleanup resources
 *
 * @interface
 * @example
 * class MyProvider extends OakViewDataProvider {
 *   async initialize(config) {
 *     // Connect to your data source
 *   }
 *
 *   async fetchHistorical(symbol, interval, from, to) {
 *     // Return array of OHLCV bars
 *   }
 *
 *   subscribe(symbol, interval, callback) {
 *     // Call callback(bar) when new data arrives
 *     return () => {}; // cleanup function
 *   }
 * }
 */
class OakViewDataProvider {
  /**
   * Initialize the data provider with configuration
   * 
   * REQUIRED: Must be implemented by all providers
   * 
   * @param {Object} config - Provider-specific configuration
   * @returns {Promise<void>}
   * @example
   * await provider.initialize({ 
   *   apiKey: 'xxx', 
   *   baseUrl: 'https://api.example.com' 
   * });
   */
  async initialize(config) {
    // Override in subclass
  }

  /**
   * Fetch historical OHLCV data
   * 
   * REQUIRED: Must be implemented by all providers
   * 
   * Returns an array of OHLCV bars sorted in ascending order by time.
   * Time values must be:
   * - Unix timestamps in SECONDS (not milliseconds) for intraday data
   * - BusinessDay objects { year, month, day } for daily+ data
   * 
   * @param {string} symbol - The symbol to fetch (e.g., 'AAPL', 'SPX')
   * @param {string} interval - Timeframe (e.g., '1m', '5m', '1h', '1D', '1W')
   * @param {number} [from] - Start Unix timestamp in seconds (optional)
   * @param {number} [to] - End Unix timestamp in seconds (optional)
   * @returns {Promise<Array<OHLCVData>>} Array of OHLCV bars (sorted ascending)
   * @throws {Error} If symbol not found or data unavailable
   * @example
   * // Fetch last year of daily data
   * const data = await provider.fetchHistorical('AAPL', '1D');
   * // Returns: [
   * //   { time: 1704067200, open: 185.14, high: 186.95, low: 184.50, close: 185.64, volume: 52000000 },
   * //   { time: 1704153600, open: 185.28, high: 188.13, low: 185.19, close: 187.43, volume: 55000000 },
   * //   ...
   * // ]
   * 
   * // Fetch specific date range
   * const from = Math.floor(new Date('2024-01-01').getTime() / 1000);
   * const to = Math.floor(new Date('2024-12-31').getTime() / 1000);
   * const yearData = await provider.fetchHistorical('AAPL', '1D', from, to);
   */
  async fetchHistorical(symbol, interval, from = null, to = null) {
    throw new Error('fetchHistorical() must be implemented by subclass');
  }

  /**
   * Subscribe to real-time data updates
   * 
   * OPTIONAL: Implement for live data support
   * 
   * Called when the chart wants to receive real-time updates for a symbol.
   * You should call the callback whenever new data arrives (tick updates or completed bars).
   * Return an unsubscribe function for cleanup.
   * 
   * @param {string} symbol - The symbol to subscribe to
   * @param {string} interval - Timeframe for bar aggregation
   * @param {Function} callback - Called with new OHLCV data: (data: OHLCVData) => void
   * @returns {Function} Unsubscribe function
   * @example
   * subscribe(symbol, interval, callback) {
   *   const ws = new WebSocket('wss://api.example.com/stream');
   *   
   *   ws.onmessage = (event) => {
   *     const tick = JSON.parse(event.data);
   *     if (tick.symbol === symbol) {
   *       // Aggregate into bar and call callback
   *       callback({
   *         time: Math.floor(Date.now() / 1000),
   *         open: tick.price,
   *         high: tick.price,
   *         low: tick.price,
   *         close: tick.price,
   *         volume: tick.volume
   *       });
   *     }
   *   };
   *   
   *   // Return cleanup function
   *   return () => {
   *     ws.close();
   *   };
   * }
   */
  subscribe(symbol, interval, callback) {
    console.warn(`${this.constructor.name} does not support real-time subscriptions`);
    return () => {}; // Return no-op unsubscribe function
  }

  /**
   * Unsubscribe from real-time updates
   * 
   * DEPRECATED: Return an unsubscribe function from subscribe() instead
   * 
   * @param {string} subscriptionId - The subscription ID from subscribe()
   * @deprecated Use the unsubscribe function returned by subscribe()
   */
  unsubscribe(subscriptionId) {
    // Override in subclass if needed
  }

  /**
   * Search for symbols by name or ticker
   * 
   * OPTIONAL: Implement for symbol search functionality
   * 
   * @param {string} query - Search term (e.g., 'AAPL', 'Apple', 'tech')
   * @returns {Promise<Array<SymbolInfo>>} Array of matching symbols
   * @example
   * async searchSymbols(query) {
   *   const response = await fetch(`https://api.example.com/search?q=${query}`);
   *   const results = await response.json();
   *   
   *   return results.map(r => ({
   *     symbol: r.ticker,
   *     name: r.companyName,
   *     exchange: r.exchange,
   *     type: r.assetType
   *   }));
   * }
   */
  async searchSymbols(query) {
    // Optional - return empty array if not implemented
    return [];
  }

  /**
   * Get available timeframe intervals for a symbol
   * 
   * OPTIONAL: Implement to control which intervals appear in the UI
   * 
   * If not implemented, OakView will show all standard intervals.
   * Useful for providers with limited data (e.g., CSV files with specific intervals).
   * 
   * @param {string} symbol - The symbol to check
   * @returns {Array<string>} Array of available intervals (e.g., ['1m', '5m', '1h', '1D'])
   * @example
   * getAvailableIntervals(symbol) {
   *   // If you only have daily and weekly data
   *   return ['1D', '1W'];
   * }
   * 
   * @example
   * // For a CSV provider with file-based intervals
   * getAvailableIntervals(symbol) {
   *   const files = this.getFilesForSymbol(symbol);
   *   return files.map(f => f.interval); // ['1D', '1h', '5m']
   * }
   */
  getAvailableIntervals(symbol) {
    // Return null to indicate "all intervals available"
    return null;
  }

  /**
   * Get the base (native) interval for a symbol
   * 
   * OPTIONAL: Implement if you need to indicate the original data resolution
   * 
   * This is the finest granularity at which your data exists.
   * If the user requests a different interval, you may need to resample.
   * 
   * @param {string} symbol - The symbol to check
   * @returns {string|null} Base interval (e.g., '1m', '1D') or null
   * @example
   * getBaseInterval(symbol) {
   *   // If your API provides minute data
   *   return '1m';
   * }
   * 
   * @example
   * // For a CSV provider
   * getBaseInterval(symbol) {
   *   const files = this.getFilesForSymbol(symbol);
   *   // Return the finest granularity available
   *   return files[0]?.interval || '1D';
   * }
   */
  getBaseInterval(symbol) {
    return null;
  }

  /**
   * Check if data exists for a symbol at a specific interval
   * 
   * OPTIONAL: Implement for better UX (disabling unavailable intervals)
   * 
   * Useful for providers with limited data availability.
   * Return true if you can provide data for this symbol/interval combination.
   * 
   * @param {string} symbol - The symbol to check
   * @param {string} interval - The interval to check (e.g., '1m', '1D')
   * @returns {boolean} True if data exists
   * @example
   * hasData(symbol, interval) {
   *   return this.availableData.has(`${symbol}_${interval}`);
   * }
   * 
   * @example
   * // For CSV provider
   * hasData(symbol, interval) {
   *   return fs.existsSync(`./data/${symbol}_${interval}.csv`);
   * }
   */
  hasData(symbol, interval) {
    // By default, assume all data is available
    return true;
  }

  /**
   * Disconnect and cleanup resources
   * 
   * OPTIONAL: Implement if you need cleanup (close WebSockets, etc.)
   * 
   * Called when the chart is destroyed or provider is changed.
   * 
   * @example
   * disconnect() {
   *   if (this.websocket) {
   *     this.websocket.close();
   *   }
   *   this.activeSubscriptions.clear();
   * }
   */
  disconnect() {
    // Override in subclass if needed
  }
}

/**
 * @typedef {Object} OHLCVData
 * @property {string|number} time - Unix timestamp (seconds) or date string
 * @property {number} open - Opening price
 * @property {number} high - Highest price
 * @property {number} low - Lowest price
 * @property {number} close - Closing price
 * @property {number} [volume] - Trading volume (optional)
 */

/**
 * @typedef {Object} SymbolInfo
 * @property {string} symbol - Symbol ticker (e.g., 'AAPL')
 * @property {string} name - Full company/instrument name
 * @property {string} [exchange] - Exchange name (optional)
 * @property {string} [type] - Asset type: 'stock', 'etf', 'future', etc. (optional)
 */

export default OakViewDataProvider;
