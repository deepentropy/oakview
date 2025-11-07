import OakViewDataProvider from '../../../src/data-providers/base.js';

/**
 * VoltTrading Data Provider
 *
 * Adapter for VoltTrading's WebSocket and REST API services.
 * Provides both historical data and real-time streaming.
 *
 * Features:
 * - Historical data via REST API
 * - Real-time quotes via WebSocket
 * - Client-side bar aggregation
 * - Multiple symbol support
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

    // Track subscriptions: { subscriptionId: { symbol, interval, callback, currentBar, quoteListener } }
    this.subscriptions = new Map();

    // Track which symbols are subscribed via API
    this.subscribedSymbols = new Set();
  }

  /**
   * Initialize the provider by connecting WebSocket
   */
  async initialize(config) {
    return new Promise((resolve, reject) => {
      if (this.wsService.isConnected()) {
        resolve();
        return;
      }

      // Wait for connection
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      const unsubConnected = this.wsService.on('connected', () => {
        clearTimeout(timeout);
        unsubConnected();
        resolve();
      });

      const unsubError = this.wsService.on('error', (error) => {
        clearTimeout(timeout);
        unsubConnected();
        unsubError();
        reject(error);
      });

      // Connect if not already connected
      this.wsService.connect();
    });
  }

  /**
   * Fetch historical OHLCV data
   * @param {string} symbol - Symbol to fetch
   * @param {string} interval - Timeframe (volttrading format: '1', '5', '15', '60', '1D')
   * @param {number} [from] - Start timestamp (optional, not used by volttrading API)
   * @param {number} [to] - End timestamp (optional, not used by volttrading API)
   * @returns {Promise<Array<OHLCVData>>}
   */
  async fetchHistorical(symbol, interval = '1D', from = null, to = null) {
    try {
      // Convert interval to volttrading format if needed
      const vtInterval = this.convertInterval(interval);

      // Determine duration based on interval
      const duration = this.getDuration(vtInterval);

      console.log(`Fetching historical data: ${symbol}, interval: ${vtInterval}, duration: ${duration}`);

      const response = await this.apiService.getHistoricalData(symbol, duration, vtInterval);

      if (!response || !response.bars || response.bars.length === 0) {
        console.warn('No historical data received');
        return [];
      }

      // Transform to OakView format
      const data = response.bars.map(bar => ({
        time: Math.floor(new Date(bar.timestamp + 'Z').getTime() / 1000), // Unix timestamp in seconds
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0
      }));

      console.log(`Historical data loaded: ${data.length} bars`);
      return data;
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time data updates
   * @param {string} symbol - Symbol to subscribe to
   * @param {string} interval - Timeframe for bar aggregation
   * @param {Function} callback - Called with new OHLCV data
   * @returns {Function} Unsubscribe function
   */
  subscribe(symbol, interval, callback) {
    const subscriptionId = `${symbol}_${interval}_${Date.now()}`;

    console.log(`Subscribing to real-time data: ${symbol} (${interval})`);

    // Subscribe to symbol via API (if not already subscribed)
    if (!this.subscribedSymbols.has(symbol)) {
      this.apiService.subscribeMarketData([symbol]).catch(error => {
        console.error('Failed to subscribe to market data:', error);
      });
      this.subscribedSymbols.add(symbol);
    }

    // Setup subscription state
    const subscription = {
      symbol,
      interval,
      callback,
      currentBar: null,
      quoteListener: null
    };

    // Listen for quote updates
    subscription.quoteListener = this.wsService.on('quote', (data) => {
      if (data.symbol !== symbol) return;

      // Extract last price from quote
      const quote = data.quote;
      const lastPrice = quote.last || quote.bid || quote.ask;

      if (!lastPrice) return;

      // Get bar time for this interval
      const barTime = this.getBarTime(interval);

      // Initialize or update current bar
      if (!subscription.currentBar || subscription.currentBar.time !== barTime) {
        // New bar period
        subscription.currentBar = {
          time: barTime,
          open: lastPrice,
          high: lastPrice,
          low: lastPrice,
          close: lastPrice,
          volume: quote.volume || 0
        };
      } else {
        // Update existing bar
        subscription.currentBar.high = Math.max(subscription.currentBar.high, lastPrice);
        subscription.currentBar.low = Math.min(subscription.currentBar.low, lastPrice);
        subscription.currentBar.close = lastPrice;
        if (quote.volume) {
          subscription.currentBar.volume = quote.volume;
        }
      }

      // Call callback with updated bar
      callback({ ...subscription.currentBar });
    });

    this.subscriptions.set(subscriptionId, subscription);

    // Return unsubscribe function
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Unsubscribe from real-time updates
   * @param {string} subscriptionId
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    console.log(`Unsubscribing from: ${subscription.symbol} (${subscription.interval})`);

    // Remove WebSocket listener
    if (subscription.quoteListener) {
      subscription.quoteListener(); // Call unsubscribe function
    }

    this.subscriptions.delete(subscriptionId);

    // Check if any other subscriptions need this symbol
    const symbolStillNeeded = Array.from(this.subscriptions.values())
      .some(sub => sub.symbol === subscription.symbol);

    // Unsubscribe from API if no longer needed
    if (!symbolStillNeeded && this.subscribedSymbols.has(subscription.symbol)) {
      this.apiService.unsubscribeMarketData([subscription.symbol]).catch(error => {
        console.error('Failed to unsubscribe from market data:', error);
      });
      this.subscribedSymbols.delete(subscription.symbol);
    }
  }

  /**
   * Search for symbols
   * @param {string} query - Search term
   * @returns {Promise<Array<SymbolInfo>>}
   */
  async searchSymbols(query) {
    try {
      const results = await this.apiService.searchSymbols(query);

      // Transform to OakView format
      return results.map(result => ({
        symbol: result.symbol,
        name: result.description || result.symbol,
        exchange: result.primaryExchange || result.exchange || 'Unknown',
        type: result.secType || result.type || 'stock'
      }));
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    // Unsubscribe all
    for (const [subscriptionId] of this.subscriptions) {
      this.unsubscribe(subscriptionId);
    }

    // Disconnect WebSocket
    this.wsService.disconnect();
  }

  /**
   * Convert interval to volttrading format
   * @private
   */
  convertInterval(interval) {
    // Map common formats to volttrading format
    const intervalMap = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '2h': '120',
      '4h': '240',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };

    return intervalMap[interval.toLowerCase()] || interval;
  }

  /**
   * Get appropriate duration for interval
   * @private
   */
  getDuration(interval) {
    // Determine how much history to fetch based on interval
    const durationMap = {
      '1': '1 D',    // 1 min -> 1 day
      '5': '3 D',    // 5 min -> 3 days
      '15': '1 W',   // 15 min -> 1 week
      '30': '2 W',   // 30 min -> 2 weeks
      '60': '1 M',   // 1 hour -> 1 month
      '120': '2 M',  // 2 hour -> 2 months
      '240': '3 M',  // 4 hour -> 3 months
      '1D': '1 Y',   // 1 day -> 1 year
      '1W': '5 Y',   // 1 week -> 5 years
      '1M': '10 Y'   // 1 month -> 10 years
    };

    return durationMap[interval] || '1 Y';
  }

  /**
   * Get bar start time for current interval
   * @private
   */
  getBarTime(interval) {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds

    // Parse interval
    const intervalSeconds = this.intervalToSeconds(interval);

    // Round down to bar boundary
    return Math.floor(now / intervalSeconds) * intervalSeconds;
  }

  /**
   * Convert interval to seconds
   * @private
   */
  intervalToSeconds(interval) {
    const num = parseInt(interval);

    if (interval.endsWith('D')) {
      return 86400; // 1 day
    } else if (interval.endsWith('W')) {
      return 604800; // 1 week
    } else if (interval.endsWith('M')) {
      return 2592000; // ~30 days
    } else {
      // Minutes
      return num * 60;
    }
  }
}

export default VoltTradingProvider;
