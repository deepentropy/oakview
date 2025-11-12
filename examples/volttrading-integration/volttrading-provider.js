import { OakViewDataProvider } from '../../src/data-providers/index.js';

/**
 * VoltTrading Data Provider - Production Version
 *
 * Adapter for VoltTrading's WebSocket and REST API services.
 * Provides both historical data and real-time streaming with client-side bar aggregation.
 *
 * Features:
 * - Historical data via REST API (with timezone-aware timestamp conversion)
 * - Real-time quotes via WebSocket (aggregated into OHLCV bars)
 * - Client-side bar aggregation matching VoltTrading's Chart.jsx logic
 * - Reference-counted subscription management
 * - Support for 33 timeframes (seconds, minutes, hours, days, weeks, months)
 * - Symbol search integration
 *
 * @extends OakViewDataProvider
 */
class VoltTradingProvider extends OakViewDataProvider {
  /**
   * @param {Object} config
   * @param {Object} config.wsService - VoltTrading WebSocket service instance
   * @param {Object} config.apiService - VoltTrading API service instance
   */
  constructor(config) {
    super();

    if (!config.wsService || !config.apiService) {
      throw new Error('VoltTradingProvider requires wsService and apiService');
    }

    this.wsService = config.wsService;
    this.apiService = config.apiService;

    // Track subscriptions: Map<symbol, { count: number, listeners: Set }>
    this.subscriptions = new Map();

    // Track current bars per symbol+interval: Map<string, Bar>
    this.currentBars = new Map();

    // Track WebSocket listeners for cleanup
    this.wsListeners = new Map();

    // Connection state
    this.initialized = false;
  }

  /**
   * Initialize the provider by connecting WebSocket
   * @returns {Promise<void>}
   */
  async initialize(config) {
    if (this.initialized) {
      console.log('[VoltTradingProvider] Already initialized');
      return;
    }

    console.log('[VoltTradingProvider] Initializing...');

    // Check if WebSocket is already connected
    if (this.wsService.isConnected && this.wsService.isConnected()) {
      console.log('[VoltTradingProvider] WebSocket already connected');
      this.initialized = true;
      return;
    }

    // Connect WebSocket
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout (10s)'));
      }, 10000);

      // Listen for connection
      const unsubConnected = this.wsService.on('connected', () => {
        clearTimeout(timeout);
        unsubConnected();
        this.initialized = true;
        console.log('[VoltTradingProvider] Initialized successfully');
        resolve();
      });

      // Listen for errors
      const unsubError = this.wsService.on('error', (error) => {
        clearTimeout(timeout);
        unsubConnected();
        unsubError();
        console.error('[VoltTradingProvider] Initialization error:', error);
        reject(error);
      });

      // Connect if not already connecting
      if (!this.wsService.isConnected || !this.wsService.isConnected()) {
        this.wsService.connect();
      }
    });
  }

  /**
   * Fetch historical OHLCV data
   *
   * @param {string} symbol - Symbol to fetch (e.g., 'AAPL', 'SPX')
   * @param {string} interval - OakView format ('1s', '1m', '5m', '1h', '1D')
   * @param {number} [from] - Start Unix timestamp in seconds (optional)
   * @param {number} [to] - End Unix timestamp in seconds (optional)
   * @returns {Promise<Array<OHLCVData>>} Array of OHLCV bars
   */
  async fetchHistorical(symbol, interval = '1D', from = null, to = null) {
    try {
      console.log(`[VoltTradingProvider] Fetching historical: ${symbol} @ ${interval}`);

      // Convert OakView interval to VoltTrading format
      const voltInterval = this._convertInterval(interval);

      // Calculate duration from date range or use smart default
      const duration = this._calculateDuration(from, to, voltInterval);

      console.log(`[VoltTradingProvider] Requesting: interval=${voltInterval}, duration=${duration}`);

      // Fetch from API
      const response = await this.apiService.getHistoricalData(symbol, duration, voltInterval);

      console.log(`[VoltTradingProvider] API response:`, response);

      if (!response) {
        console.error('[VoltTradingProvider] API returned null/undefined response');
        return [];
      }

      if (!response.bars) {
        console.error('[VoltTradingProvider] API response missing "bars" field:', response);
        return [];
      }

      if (response.bars.length === 0) {
        console.warn('[VoltTradingProvider] API returned empty bars array');
        return [];
      }

      // Convert to OakView format
      const data = response.bars.map((bar, index) => {
        // VoltTrading returns ISO 8601 timestamps with timezone
        // Convert to Unix timestamp in seconds (not milliseconds!)
        const timestamp = bar.timestamp;

        // Validate required fields
        if (!timestamp) {
          console.error(`[VoltTradingProvider] Bar ${index} missing timestamp:`, bar);
          throw new Error(`Bar ${index} missing timestamp`);
        }

        if (bar.open === undefined || bar.high === undefined ||
            bar.low === undefined || bar.close === undefined) {
          console.error(`[VoltTradingProvider] Bar ${index} missing OHLC data:`, bar);
          throw new Error(`Bar ${index} missing OHLC data (open: ${bar.open}, high: ${bar.high}, low: ${bar.low}, close: ${bar.close})`);
        }

        const dateStr = timestamp.includes('+') || timestamp.endsWith('Z')
          ? timestamp
          : timestamp + 'Z'; // Add Z if naive UTC

        const unixTime = Math.floor(new Date(dateStr).getTime() / 1000);

        if (isNaN(unixTime)) {
          console.error(`[VoltTradingProvider] Invalid timestamp "${timestamp}" at bar ${index}`);
          throw new Error(`Invalid timestamp: ${timestamp}`);
        }

        const convertedBar = {
          time: unixTime, // Unix seconds
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 0
        };

        // Log first bar for debugging
        if (index === 0) {
          console.log(`[VoltTradingProvider] First bar:`, convertedBar);
        }

        return convertedBar;
      });

      // IMPORTANT: Sort data in ascending order by time
      // lightweight-charts requires data to be sorted in ascending order
      data.sort((a, b) => a.time - b.time);

      // Remove duplicate timestamps by keeping only the last bar for each time
      // lightweight-charts requires unique timestamps
      const deduplicated = [];
      const seenTimes = new Set();

      // Process in reverse to keep the last occurrence of each timestamp
      for (let i = data.length - 1; i >= 0; i--) {
        const bar = data[i];
        if (!seenTimes.has(bar.time)) {
          seenTimes.add(bar.time);
          deduplicated.unshift(bar); // Add to front to maintain order
        }
      }

      console.log(`[VoltTradingProvider] Loaded ${deduplicated.length} bars (sorted, ${data.length - deduplicated.length} duplicates removed)`);
      return deduplicated;

    } catch (error) {
      console.error('[VoltTradingProvider] Failed to fetch historical data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time data updates
   *
   * This method aggregates incoming quote updates into OHLCV bars
   * matching the specified interval. The aggregation logic matches
   * VoltTrading's Chart.jsx implementation.
   *
   * @param {string} symbol - Symbol to subscribe to
   * @param {string} interval - OakView format ('1s', '1m', '1h', '1D')
   * @param {Function} callback - Called with new OHLCV data: (bar: OHLCVData) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(symbol, interval, callback) {
    const key = `${symbol}:${interval}`;
    const voltInterval = this._convertInterval(interval);

    console.log(`[VoltTradingProvider] Subscribing: ${key}`);

    // Add subscription to market data
    this._addSubscription(symbol);

    // Set up quote listener for bar aggregation
    const unsubQuote = this.wsService.on('quote', (data) => {
      if (data.symbol !== symbol) return;

      try {
        // Extract last price from quote
        const quote = data.quote;
        const lastPrice = quote.last || quote.bid || quote.ask;

        if (!lastPrice || lastPrice <= 0) {
          return; // Invalid price
        }

        // Get current bar timestamp for this interval
        const currentBarTime = this._getCurrentBarTime(voltInterval);

        // Initialize or update current bar
        if (!this.currentBars.has(key) || this.currentBars.get(key).time !== currentBarTime) {
          // New bar period
          this.currentBars.set(key, {
            time: currentBarTime,
            open: lastPrice,
            high: lastPrice,
            low: lastPrice,
            close: lastPrice,
            volume: quote.volume || 0
          });
        } else {
          // Update existing bar OHLC
          const bar = this.currentBars.get(key);
          bar.high = Math.max(bar.high, lastPrice);
          bar.low = Math.min(bar.low, lastPrice);
          bar.close = lastPrice;
          if (quote.volume) {
            bar.volume = quote.volume;
          }
        }

        // Call callback with current bar (make a copy)
        const bar = this.currentBars.get(key);
        if (bar) {
          callback({ ...bar });
        }

      } catch (error) {
        console.error('[VoltTradingProvider] Error in quote handler:', error);
      }
    });

    // Store listener for cleanup
    if (!this.wsListeners.has(key)) {
      this.wsListeners.set(key, []);
    }
    this.wsListeners.get(key).push(unsubQuote);

    // Return unsubscribe function
    return () => {
      console.log(`[VoltTradingProvider] Unsubscribing: ${key}`);

      // Remove WebSocket listener
      unsubQuote();

      // Remove from tracking
      const listeners = this.wsListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(unsubQuote);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
          this.wsListeners.delete(key);
        }
      }

      // Clear current bar
      this.currentBars.delete(key);

      // Remove subscription
      this._removeSubscription(symbol);
    };
  }

  /**
   * Unsubscribe from real-time updates (alternate method)
   * @param {string} subscriptionId - Subscription ID (not used, prefer returned function)
   */
  unsubscribe(subscriptionId) {
    // Not implemented - use the unsubscribe function returned by subscribe()
    console.warn('[VoltTradingProvider] Use the unsubscribe function returned by subscribe()');
  }

  /**
   * Search for symbols
   * @param {string} query - Search term
   * @returns {Promise<Array<SymbolInfo>>}
   */
  async searchSymbols(query) {
    try {
      console.log(`[VoltTradingProvider] Searching symbols: ${query}`);
      const response = await this.apiService.searchSymbols(query);

      // VoltTrading returns: { symbols: [...] }
      // OakView expects: [...]
      const symbols = response.symbols || [];

      return symbols.map(s => ({
        symbol: s.symbol,
        name: s.name || s.description || s.symbol,
        exchange: s.primaryExchange || s.exchange || 'Unknown',
        type: s.secType || s.type || 'stock'
      }));
    } catch (error) {
      console.error('[VoltTradingProvider] Symbol search failed:', error);
      return [];
    }
  }

  /**
   * Disconnect and cleanup all subscriptions
   */
  disconnect() {
    console.log('[VoltTradingProvider] Disconnecting...');

    // Unsubscribe all symbols
    for (const symbol of this.subscriptions.keys()) {
      this.apiService.unsubscribeMarketData([symbol])
        .catch(err => console.error('[VoltTradingProvider] Unsubscribe error:', err));
    }

    // Clear all state
    this.subscriptions.clear();
    this.currentBars.clear();
    this.wsListeners.clear();
    this.initialized = false;

    console.log('[VoltTradingProvider] Disconnected');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Convert OakView interval format to VoltTrading format
   * @private
   * @param {string} interval - OakView format ('1s', '1m', '5m', '1h', '1D')
   * @returns {string} VoltTrading format ('1S', '1', '5', '60', '1D')
   */
  _convertInterval(interval) {
    const lower = interval.toLowerCase();

    // Map common formats
    const intervalMap = {
      // Seconds
      '1s': '1S',
      '5s': '5S',
      '10s': '10S',
      '15s': '15S',
      '30s': '30S',
      '45s': '45S',

      // Minutes (VoltTrading uses just the number)
      '1m': '1',
      '2m': '2',
      '3m': '3',
      '4m': '4',
      '5m': '5',
      '10m': '10',
      '15m': '15',
      '30m': '30',
      '45m': '45',

      // Hours (in minutes)
      '1h': '60',
      '2h': '120',
      '3h': '180',
      '4h': '240',

      // Days/Weeks/Months
      '1d': '1D',
      '1w': '1W',
      // Note: '1M' (uppercase) for 1 month to avoid conflict with '1m' (minute)
      '1M': '1M',
      '3M': '3M',
      '6M': '6M',
      '12M': '12M'
    };

    return intervalMap[lower] || interval; // Return as-is if not found
  }

  /**
   * Calculate duration string from date range or use smart defaults
   * @private
   * @param {number} from - Start Unix timestamp (seconds)
   * @param {number} to - End Unix timestamp (seconds)
   * @param {string} voltInterval - VoltTrading interval format
   * @returns {string} Duration string ('1 D', '1 W', '1 M', '1 Y')
   */
  _calculateDuration(from, to, voltInterval) {
    // If date range provided, calculate duration
    if (from && to) {
      const days = Math.ceil((to - from) / (24 * 60 * 60));

      if (days <= 1) return '1 D';
      if (days <= 7) return `${days} D`;
      if (days <= 30) return `${Math.ceil(days / 7)} W`;
      if (days <= 365) return `${Math.ceil(days / 30)} M`;
      return `${Math.ceil(days / 365)} Y`;
    }

    // Otherwise use smart defaults based on interval
    const durationMap = {
      // Seconds
      '1S': '1 D',
      '5S': '1 D',
      '10S': '1 D',
      '15S': '1 D',
      '30S': '1 D',
      '45S': '1 D',

      // Minutes
      '1': '2 D',     // 1 min → 2 days
      '2': '2 D',
      '3': '2 D',
      '4': '2 D',
      '5': '3 D',     // 5 min → 3 days
      '10': '1 W',
      '15': '1 W',    // 15 min → 1 week
      '30': '2 W',    // 30 min → 2 weeks
      '45': '2 W',

      // Hours
      '60': '1 M',    // 1 hour → 1 month
      '120': '2 M',   // 2 hour → 2 months
      '180': '3 M',
      '240': '3 M',   // 4 hour → 3 months

      // Days/Weeks/Months
      '1D': '1 Y',    // 1 day → 1 year
      '1W': '5 Y',    // 1 week → 5 years
      '1M': '10 Y',   // 1 month → 10 years
      '3M': '10 Y',
      '6M': '10 Y',
      '12M': '10 Y'
    };

    return durationMap[voltInterval] || '1 Y';
  }

  /**
   * Get current bar start time for interval (Unix seconds)
   * This logic matches VoltTrading's Chart.jsx:227-275
   * @private
   * @param {string} voltInterval - VoltTrading interval format
   * @returns {number} Unix timestamp in seconds
   */
  _getCurrentBarTime(voltInterval) {
    const now = new Date();

    // Handle different timeframe formats
    if (voltInterval === '1D') {
      // Daily - round to start of day in UTC
      return Math.floor(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ) / 1000);

    } else if (voltInterval.endsWith('S')) {
      // Seconds (1S, 5S, 10S, etc.)
      const seconds = parseInt(voltInterval);
      const totalSeconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
      const roundedSeconds = Math.floor(totalSeconds / seconds) * seconds;
      const hours = Math.floor(roundedSeconds / 3600);
      const mins = Math.floor((roundedSeconds % 3600) / 60);
      const secs = roundedSeconds % 60;

      return Math.floor(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hours,
        mins,
        secs, 0
      ) / 1000);

    } else if (voltInterval.endsWith('W')) {
      // Weekly - round to start of week (Monday)
      const dayOfWeek = now.getUTCDay();
      const daysToMonday = (dayOfWeek + 6) % 7; // 0 = Monday
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - daysToMonday);
      monday.setUTCHours(0, 0, 0, 0);
      return Math.floor(monday.getTime() / 1000);

    } else if (voltInterval.endsWith('M')) {
      // Monthly - round to start of month
      return Math.floor(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1, 0, 0, 0, 0
      ) / 1000);

    } else {
      // Minutes or hours (numeric value = minutes)
      const minutes = parseInt(voltInterval);
      const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const roundedMinutes = Math.floor(totalMinutes / minutes) * minutes;
      const hours = Math.floor(roundedMinutes / 60);
      const mins = roundedMinutes % 60;

      return Math.floor(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hours,
        mins,
        0, 0
      ) / 1000);
    }
  }

  /**
   * Add market data subscription with reference counting
   * @private
   * @param {string} symbol
   */
  async _addSubscription(symbol) {
    if (!this.subscriptions.has(symbol)) {
      // First subscription for this symbol
      console.log(`[VoltTradingProvider] Subscribing to market data: ${symbol}`);

      try {
        await this.apiService.subscribeMarketData([symbol]);
        this.subscriptions.set(symbol, { count: 1 });
      } catch (error) {
        console.error(`[VoltTradingProvider] Failed to subscribe to ${symbol}:`, error);
        throw error;
      }
    } else {
      // Increment reference count
      this.subscriptions.get(symbol).count++;
      console.log(`[VoltTradingProvider] Incremented subscription count for ${symbol}: ${this.subscriptions.get(symbol).count}`);
    }
  }

  /**
   * Remove market data subscription with reference counting
   * @private
   * @param {string} symbol
   */
  async _removeSubscription(symbol) {
    const sub = this.subscriptions.get(symbol);
    if (!sub) return;

    sub.count--;
    console.log(`[VoltTradingProvider] Decremented subscription count for ${symbol}: ${sub.count}`);

    if (sub.count <= 0) {
      // Last subscription removed
      console.log(`[VoltTradingProvider] Unsubscribing from market data: ${symbol}`);

      try {
        await this.apiService.unsubscribeMarketData([symbol]);
        this.subscriptions.delete(symbol);
      } catch (error) {
        console.error(`[VoltTradingProvider] Failed to unsubscribe from ${symbol}:`, error);
      }
    }
  }
}

export default VoltTradingProvider;
