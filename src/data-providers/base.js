/**
 * OakView Data Provider Base Class
 *
 * This is the base interface that all data providers must implement.
 * Data providers handle fetching historical data and streaming real-time updates.
 *
 * @interface
 */
class OakViewDataProvider {
  /**
   * Initialize the data provider with configuration
   * @param {Object} config - Provider-specific configuration
   * @returns {Promise<void>}
   * @example
   * await provider.initialize({ apiKey: 'xxx', baseUrl: 'https://api.example.com' });
   */
  async initialize(config) {
    // Override in subclass
  }

  /**
   * Fetch historical OHLCV data
   * @param {string} symbol - The symbol to fetch (e.g., 'AAPL', 'SPX')
   * @param {string} interval - Timeframe (e.g., '1', '5', '15', '60', '1D')
   * @param {number} [from] - Start timestamp (optional)
   * @param {number} [to] - End timestamp (optional)
   * @returns {Promise<Array<OHLCVData>>} Array of OHLCV bars
   * @example
   * const data = await provider.fetchHistorical('AAPL', '1D');
   */
  async fetchHistorical(symbol, interval, from = null, to = null) {
    throw new Error('fetchHistorical() must be implemented by subclass');
  }

  /**
   * Subscribe to real-time data updates
   * @param {string} symbol - The symbol to subscribe to
   * @param {string} interval - Timeframe for bar aggregation
   * @param {Function} callback - Called with new OHLCV data: (data: OHLCVData) => void
   * @returns {string|Function} Subscription ID or unsubscribe function
   * @example
   * const unsubscribe = provider.subscribe('AAPL', '1D', (data) => {
   *   console.log('New bar:', data);
   * });
   * // Later: unsubscribe();
   */
  subscribe(symbol, interval, callback) {
    console.warn(`${this.constructor.name} does not support real-time subscriptions`);
    return () => {}; // Return no-op unsubscribe function
  }

  /**
   * Unsubscribe from real-time updates
   * @param {string} subscriptionId - The subscription ID from subscribe()
   */
  unsubscribe(subscriptionId) {
    // Override in subclass if needed
  }

  /**
   * Search for symbols (optional)
   * @param {string} query - Search term
   * @returns {Promise<Array<SymbolInfo>>} Array of matching symbols
   * @example
   * const results = await provider.searchSymbols('AAPL');
   */
  async searchSymbols(query) {
    // Optional - return empty array if not implemented
    return [];
  }

  /**
   * Disconnect and cleanup resources
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
