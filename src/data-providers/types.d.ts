/**
 * OakView Data Provider TypeScript Type Definitions
 * 
 * Use these types to implement type-safe data providers for OakView.
 * Even if you're not using TypeScript, these definitions document the exact
 * contract OakView expects.
 */

/**
 * OHLCV Bar Data
 * 
 * Represents a single candlestick/bar on the chart.
 * 
 * CRITICAL REQUIREMENTS:
 * - `time` must be Unix timestamp in SECONDS (not milliseconds!)
 * - For intraday data: Unix timestamp as number (e.g., 1704067200)
 * - For daily+ data: Can use BusinessDay object { year: 2024, month: 1, day: 1 }
 * - Data MUST be sorted in ascending order (oldest first)
 * - All OHLC values must be numbers, not strings
 */
export interface OHLCVBar {
  /**
   * Time of the bar
   * - Intraday: Unix timestamp in SECONDS (e.g., 1704067200, NOT 1704067200000)
   * - Daily+: Unix timestamp OR BusinessDay object { year, month, day }
   * - MUST be in UTC
   * - MUST be sorted ascending (oldest first)
   */
  time: number | BusinessDay;
  
  /** Opening price (must be a number, not a string) */
  open: number;
  
  /** Highest price during the period */
  high: number;
  
  /** Lowest price during the period */
  low: number;
  
  /** Closing price */
  close: number;
  
  /** Trading volume (optional) */
  volume?: number;
}

/**
 * Business Day format for daily or higher timeframes
 * Used when you want OakView to handle timezone conversions
 */
export interface BusinessDay {
  /** Full year (e.g., 2024) */
  year: number;
  
  /** Month (1-12, NOT 0-11 like JavaScript Date) */
  month: number;
  
  /** Day of month (1-31) */
  day: number;
}

/**
 * Symbol Search Result
 * 
 * Returned by searchSymbols() to populate the symbol search dropdown.
 * 
 * Display format in OakView:
 * - Primary display: `symbol` (e.g., "AAPL")
 * - Secondary line: `name` (e.g., "Apple Inc.")
 * - Badge: `exchange` (e.g., "NASDAQ")
 */
export interface SymbolInfo {
  /**
   * Symbol ticker
   * - Format: Uppercase ticker (e.g., "AAPL", "SPX", "BTCUSD")
   * - Displayed prominently in search results
   * - REQUIRED
   */
  symbol: string;
  
  /**
   * Full name/description
   * - Displayed below the symbol in search results
   * - E.g., "Apple Inc.", "S&P 500 Index"
   * - REQUIRED
   */
  name: string;
  
  /**
   * Exchange name
   * - Displayed as a badge in search results
   * - E.g., "NASDAQ", "NYSE", "CRYPTO"
   * - OPTIONAL but recommended
   */
  exchange?: string;
  
  /**
   * Asset type
   * - Values: "stock", "etf", "index", "future", "forex", "crypto", "bond"
   * - Used for filtering/grouping (future feature)
   * - OPTIONAL
   */
  type?: 'stock' | 'etf' | 'index' | 'future' | 'forex' | 'crypto' | 'bond' | string;
}

/**
 * Data Provider Configuration
 * 
 * Passed to initialize() method.
 * Define your own config interface extending this.
 */
export interface DataProviderConfig {
  /** Your custom configuration properties */
  [key: string]: any;
}

/**
 * Subscription Callback
 * 
 * Called by your subscribe() method when new data arrives.
 * Pass the latest bar data to this callback.
 */
export type SubscriptionCallback = (bar: OHLCVBar) => void;

/**
 * Unsubscribe Function
 * 
 * Returned by subscribe() method.
 * OakView will call this to cleanup when switching symbols/intervals.
 */
export type UnsubscribeFunction = () => void;

/**
 * OakView Data Provider Interface
 * 
 * Implement this interface to create a custom data provider.
 * 
 * REQUIRED METHODS:
 * - initialize(config): Setup connection
 * - fetchHistorical(symbol, interval, from?, to?): Load historical bars
 * 
 * OPTIONAL METHODS (improve UX if implemented):
 * - subscribe(symbol, interval, callback): Real-time updates
 * - searchSymbols(query): Symbol search
 * - getAvailableIntervals(symbol): List available timeframes
 * - getBaseInterval(symbol): Native data resolution
 * - hasData(symbol, interval): Check data availability
 * - disconnect(): Cleanup resources
 * 
 * CALL SEQUENCE:
 * 1. OakView calls initialize() once when provider is set
 * 2. User selects symbol → searchSymbols() called (if implemented)
 * 3. User selects symbol/interval → fetchHistorical() called
 * 4. If subscribe() implemented → called after historical data loads
 * 5. User changes symbol/interval → unsubscribe previous, repeat from step 3
 * 6. Component destroyed → disconnect() called (if implemented)
 * 
 * @example
 * class MyProvider implements OakViewDataProvider {
 *   async initialize(config: DataProviderConfig): Promise<void> {
 *     // Connect to your data source
 *   }
 * 
 *   async fetchHistorical(
 *     symbol: string,
 *     interval: string,
 *     from?: number,
 *     to?: number
 *   ): Promise<OHLCVBar[]> {
 *     // Load and return historical data
 *     return [];
 *   }
 * }
 */
export interface OakViewDataProvider {
  /**
   * Initialize the data provider
   * 
   * REQUIRED: Must implement this method
   * 
   * Called once when setDataProvider() is called on the chart.
   * Use this to:
   * - Authenticate with your API
   * - Establish WebSocket connections
   * - Load configuration
   * 
   * @param config - Provider-specific configuration
   * @returns Promise that resolves when initialization is complete
   * @throws Error if connection fails
   * 
   * @example
   * async initialize(config: { apiKey: string }): Promise<void> {
   *   this.apiKey = config.apiKey;
   *   this.ws = new WebSocket('wss://api.example.com');
   *   await new Promise(resolve => this.ws.onopen = resolve);
   * }
   */
  initialize(config: DataProviderConfig): Promise<void>;

  /**
   * Fetch historical OHLCV bars
   * 
   * REQUIRED: Must implement this method
   * 
   * Called when:
   * - Chart first loads
   * - User changes symbol
   * - User changes interval
   * - User pans left (may request more historical data)
   * 
   * Caching behavior:
   * - OakView does NOT cache results
   * - You should implement caching in your provider if needed
   * - Same symbol/interval may be called multiple times
   * 
   * CRITICAL REQUIREMENTS:
   * - Return array sorted in ASCENDING order (oldest first)
   * - Time must be Unix seconds (NOT milliseconds)
   * - Remove duplicate timestamps
   * - Prices must be numbers (not strings)
   * 
   * @param symbol - Symbol ticker (e.g., "AAPL", "SPX")
   * @param interval - Timeframe in OakView format:
   *   - Minutes: "1m", "5m", "15m", "30m"
   *   - Hours: "1h", "2h", "4h"
   *   - Days+: "1D", "1W", "1M"
   *   Note: May also receive numeric format: "1", "5", "60" (minutes)
   * @param from - Start Unix timestamp in SECONDS (optional)
   * @param to - End Unix timestamp in SECONDS (optional)
   * @returns Array of OHLCV bars sorted ascending by time
   * @throws Error if symbol not found or API error
   * 
   * @example
   * async fetchHistorical(
   *   symbol: string,
   *   interval: string,
   *   from?: number,
   *   to?: number
   * ): Promise<OHLCVBar[]> {
   *   const response = await fetch(
   *     `${this.apiUrl}/bars?symbol=${symbol}&interval=${interval}`
   *   );
   *   const data = await response.json();
   *   
   *   return data.bars
   *     .map(bar => ({
   *       time: new Date(bar.date).getTime() / 1000, // Unix seconds (supports sub-second precision)
   *       open: parseFloat(bar.open),
   *       high: parseFloat(bar.high),
   *       low: parseFloat(bar.low),
   *       close: parseFloat(bar.close),
   *       volume: parseFloat(bar.volume || 0)
   *     }))
   *     .sort((a, b) => (a.time as number) - (b.time as number)); // ASCENDING!
   * }
   */
  fetchHistorical(
    symbol: string,
    interval: string,
    from?: number,
    to?: number
  ): Promise<OHLCVBar[]>;

  /**
   * Subscribe to real-time data updates
   * 
   * OPTIONAL: Implement for live data support
   * 
   * Called after fetchHistorical() completes successfully.
   * OakView will call the provided callback whenever you have new data.
   * 
   * You should:
   * - Setup WebSocket listener or polling
   * - Aggregate ticks into bars matching the interval
   * - Call callback(bar) with updated bar data
   * - Return a cleanup function
   * 
   * When called:
   * - After historical data loads successfully
   * - Only if this method is implemented
   * 
   * Cleanup:
   * - OakView will call the returned unsubscribe function when:
   *   - User changes symbol/interval
   *   - Component is destroyed
   * 
   * @param symbol - Symbol to subscribe to
   * @param interval - Timeframe for bar aggregation
   * @param callback - Call this with new/updated bar data
   * @returns Unsubscribe function for cleanup
   * 
   * @example
   * subscribe(
   *   symbol: string,
   *   interval: string,
   *   callback: SubscriptionCallback
   * ): UnsubscribeFunction {
   *   const ws = new WebSocket('wss://api.example.com/stream');
   *   
   *   ws.onmessage = (event) => {
   *     const tick = JSON.parse(event.data);
   *     if (tick.symbol === symbol) {
   *       // Aggregate tick into bar
   *       const bar = this.aggregateTick(tick, interval);
   *       callback(bar);
   *     }
   *   };
   *   
   *   // Return cleanup function
   *   return () => {
   *     ws.close();
   *   };
   * }
   */
  subscribe?(
    symbol: string,
    interval: string,
    callback: SubscriptionCallback
  ): UnsubscribeFunction;

  /**
   * Unsubscribe from real-time updates
   * 
   * DEPRECATED: Return cleanup function from subscribe() instead
   * 
   * This method is legacy and not recommended.
   * Prefer returning an unsubscribe function from subscribe().
   * 
   * @param subscriptionId - Subscription identifier
   * @deprecated Use cleanup function returned by subscribe()
   */
  unsubscribe?(subscriptionId: string): void;

  /**
   * Search for symbols
   * 
   * OPTIONAL: Implement for symbol search functionality
   * 
   * Called when:
   * - User types in the symbol search box
   * - Debounced by OakView (300ms delay)
   * - Called with empty string on initial dropdown open
   * 
   * Return format:
   * - Array of SymbolInfo objects
   * - Will be displayed in a dropdown list
   * - Limited to first 50 results by OakView
   * 
   * @param query - Search term (may be empty string for "show all")
   * @returns Array of matching symbols
   * 
   * @example
   * async searchSymbols(query: string): Promise<SymbolInfo[]> {
   *   const response = await fetch(
   *     `${this.apiUrl}/search?q=${encodeURIComponent(query)}`
   *   );
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
  searchSymbols?(query: string): Promise<SymbolInfo[]>;

  /**
   * Get available timeframe intervals for a symbol
   * 
   * OPTIONAL: Implement to control interval dropdown
   * 
   * Called when:
   * - User changes symbol
   * - Used to populate/filter interval dropdown
   * 
   * Return format:
   * - Array of interval strings (e.g., ["1m", "5m", "1D"])
   * - null or undefined to show all standard intervals
   * 
   * Use case:
   * - CSV provider with only specific intervals available
   * - API with limited timeframe support
   * 
   * Standard intervals (if null returned):
   * ["1", "5", "15", "30", "60", "120", "180", "240", "1D", "1W", "1M"]
   * 
   * @param symbol - Symbol to check
   * @returns Array of available intervals or null for all
   * 
   * @example
   * getAvailableIntervals(symbol: string): string[] | null {
   *   // CSV provider - only show intervals we have files for
   *   return this.files
   *     .filter(f => f.symbol === symbol)
   *     .map(f => f.interval);
   * }
   * 
   * @example
   * getAvailableIntervals(symbol: string): string[] | null {
   *   // All intervals available
   *   return null;
   * }
   */
  getAvailableIntervals?(symbol: string): string[] | null;

  /**
   * Get the base (native) interval for a symbol
   * 
   * OPTIONAL: Implement to indicate original data resolution
   * 
   * Called when:
   * - User changes symbol
   * - Used for informational purposes
   * 
   * Return format:
   * - Interval string (e.g., "1m", "1D")
   * - null if not applicable
   * 
   * Use case:
   * - Show "resampled" indicator when user requests different interval
   * - Inform user of native data granularity
   * 
   * @param symbol - Symbol to check
   * @returns Base interval or null
   * 
   * @example
   * getBaseInterval(symbol: string): string | null {
   *   // Minute data API
   *   return "1m";
   * }
   * 
   * @example
   * getBaseInterval(symbol: string): string | null {
   *   // CSV provider - return finest available
   *   const intervals = this.getAvailableIntervals(symbol);
   *   return intervals?.[0] || null;
   * }
   */
  getBaseInterval?(symbol: string): string | null;

  /**
   * Check if data exists for symbol/interval combination
   * 
   * OPTIONAL: Implement to disable unavailable intervals
   * 
   * Called when:
   * - Building interval dropdown
   * - Used to disable intervals that don't have data
   * 
   * Return format:
   * - true if data available
   * - false to disable this interval in UI
   * 
   * Use case:
   * - CSV provider checking file existence
   * - API with known data availability matrix
   * 
   * @param symbol - Symbol to check
   * @param interval - Interval to check
   * @returns true if data available, false otherwise
   * 
   * @example
   * hasData(symbol: string, interval: string): boolean {
   *   // CSV provider
   *   return this.files.some(f => 
   *     f.symbol === symbol && f.interval === interval
   *   );
   * }
   * 
   * @example
   * hasData(symbol: string, interval: string): boolean {
   *   // Assume all data available
   *   return true;
   * }
   */
  hasData?(symbol: string, interval: string): boolean;

  /**
   * Cleanup and disconnect
   * 
   * OPTIONAL: Implement if you need cleanup
   * 
   * Called when:
   * - Chart component is destroyed
   * - New provider is set (replaces current)
   * 
   * Use this to:
   * - Close WebSocket connections
   * - Cancel pending HTTP requests
   * - Clear caches
   * - Cleanup subscriptions
   * 
   * @example
   * disconnect(): void {
   *   if (this.ws) {
   *     this.ws.close();
   *   }
   *   this.cache.clear();
   *   this.abortController.abort();
   * }
   */
  disconnect?(): void;
}

/**
 * Validation result for a data provider
 */
export interface ProviderValidationResult {
  /** Whether the provider passes validation */
  valid: boolean;
  
  /** List of validation errors (empty if valid) */
  errors: ValidationError[];
  
  /** List of validation warnings (missing optional features) */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  method: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  method: string;
  message: string;
  severity: 'warning';
}

/**
 * Interval format used by OakView
 * 
 * Common formats:
 * - Seconds: "1S", "5S", "10S", "15S", "30S"
 * - Minutes: "1m", "5m", "15m", "30m", "45m" or numeric "1", "5", "15", "30"
 * - Hours: "1h", "2h", "4h" or in minutes "60", "120", "240"
 * - Days: "1D"
 * - Weeks: "1W"
 * - Months: "1M"
 */
export type IntervalFormat = string;

/**
 * Export all types for convenience
 */
export {
  OakViewDataProvider as default
};
