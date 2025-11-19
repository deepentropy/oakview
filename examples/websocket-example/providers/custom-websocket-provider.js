import { OakViewDataProvider } from '../../../dist/oakview.es.js';

/**
 * Custom WebSocket Data Provider Template
 *
 * This is a template for creating your own WebSocket data provider.
 * Customize this class to integrate with your specific WebSocket API.
 *
 * @extends OakViewDataProvider
 */
class CustomWebSocketProvider extends OakViewDataProvider {
  /**
   * @param {Object} config
   * @param {string} config.wsUrl - WebSocket endpoint URL
   * @param {string} config.apiUrl - REST API endpoint URL
   * @param {string} [config.apiKey] - Optional API key for authentication
   * @param {Object} [config.options] - Additional options
   */
  constructor(config) {
    super();

    if (!config.wsUrl || !config.apiUrl) {
      throw new Error('Both wsUrl and apiUrl are required');
    }

    this.wsUrl = config.wsUrl;
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.options = config.options || {};

    // WebSocket instance
    this.ws = null;

    // Track active subscriptions: { subscriptionId: { symbol, interval, callback, currentBar } }
    this.subscriptions = new Map();

    // Track which symbols are subscribed
    this.subscribedSymbols = new Set();

    // Connection state
    this.connected = false;
    this.connecting = false;

    // Reconnection settings
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.reconnectTimer = null;
  }

  /**
   * Initialize the WebSocket connection
   * @param {Object} config - Additional configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    if (this.connected) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.connecting) {
      console.log('WebSocket connection in progress');
      return;
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.ws = new WebSocket(this.wsUrl);

        // Connection timeout
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
          this.ws.close();
        }, 10000);

        // Handle connection open
        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('WebSocket connected');
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;

          // Send authentication if needed
          if (this.apiKey) {
            this.authenticate();
          }

          resolve();
        };

        // Handle connection error
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          this.connected = false;
          this.connecting = false;
          reject(error);
        };

        // Handle connection close
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.connected = false;
          this.connecting = false;

          // Attempt reconnection if unexpected close
          if (!event.wasClean) {
            this.attemptReconnect();
          }
        };

        // Handle incoming messages
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        this.connecting = false;
        reject(error);
      }
    });
  }

  /**
   * Authenticate with the WebSocket server
   * @private
   */
  authenticate() {
    const authMessage = {
      type: 'auth',
      apiKey: this.apiKey
    };

    this.send(authMessage);
  }

  /**
   * Fetch historical OHLCV data from REST API
   * @param {string} symbol - Symbol to fetch
   * @param {string} interval - Timeframe (e.g., '1', '5', '15', '60', '1D')
   * @param {number} [from] - Start timestamp (optional)
   * @param {number} [to] - End timestamp (optional)
   * @returns {Promise<Array<OHLCVData>>}
   */
  async fetchHistorical(symbol, interval = '1D', from = null, to = null) {
    try {
      // Build API URL
      let url = `${this.apiUrl}/history?symbol=${symbol}&interval=${interval}`;

      if (from) url += `&from=${from}`;
      if (to) url += `&to=${to}`;

      // Add API key if needed
      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      console.log('Fetching historical data:', url);

      // Fetch data
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform to OakView format
      // TODO: Adjust this based on your API response format
      const bars = data.bars || data.data || data;

      const transformed = bars.map(bar => ({
        // TODO: Adjust field names based on your API
        time: this.parseTime(bar.time || bar.timestamp || bar.date),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close),
        volume: parseFloat(bar.volume || 0)
      }));

      console.log(`Historical data loaded: ${transformed.length} bars`);
      return transformed;

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
    if (!this.connected) {
      throw new Error('WebSocket not connected. Call initialize() first.');
    }

    const subscriptionId = `${symbol}_${interval}_${Date.now()}`;
    console.log(`Subscribing to real-time data: ${symbol} @ ${interval}`);

    // Store subscription
    const subscription = {
      symbol,
      interval,
      callback,
      currentBar: null
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Subscribe to symbol if not already subscribed
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribeSymbol(symbol, interval);
      this.subscribedSymbols.add(symbol);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(subscriptionId);
  }

  /**
   * Send subscription message to WebSocket
   * @private
   */
  subscribeSymbol(symbol, interval) {
    const message = {
      type: 'subscribe',
      symbol: symbol,
      interval: interval
    };

    this.send(message);
  }

  /**
   * Unsubscribe from real-time updates
   * @param {string} subscriptionId
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    console.log(`Unsubscribing: ${subscription.symbol} @ ${subscription.interval}`);

    this.subscriptions.delete(subscriptionId);

    // Check if any other subscriptions need this symbol
    const symbolStillNeeded = Array.from(this.subscriptions.values())
      .some(sub => sub.symbol === subscription.symbol);

    // Unsubscribe from WebSocket if no longer needed
    if (!symbolStillNeeded && this.subscribedSymbols.has(subscription.symbol)) {
      this.unsubscribeSymbol(subscription.symbol);
      this.subscribedSymbols.delete(subscription.symbol);
    }
  }

  /**
   * Send unsubscribe message to WebSocket
   * @private
   */
  unsubscribeSymbol(symbol) {
    const message = {
      type: 'unsubscribe',
      symbol: symbol
    };

    this.send(message);
  }

  /**
   * Handle incoming WebSocket messages
   * @private
   * @param {string} data - Raw message data
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);

      // Handle different message types
      switch (message.type) {
        case 'bar':
        case 'update':
          this.handleBarUpdate(message);
          break;

        case 'tick':
        case 'quote':
          this.handleTickUpdate(message);
          break;

        case 'subscribed':
          console.log('Subscription confirmed:', message.symbol);
          break;

        case 'error':
          console.error('WebSocket error:', message.message);
          break;

        case 'auth_success':
          console.log('Authentication successful');
          break;

        case 'auth_error':
          console.error('Authentication failed:', message.message);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle bar update from WebSocket
   * @private
   */
  handleBarUpdate(message) {
    const { symbol, interval, time, open, high, low, close, volume } = message;

    // Find matching subscriptions
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.symbol === symbol && subscription.interval === interval) {
        const bar = {
          time: this.parseTime(time),
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volume || 0)
        };

        subscription.currentBar = bar;
        subscription.callback(bar);
      }
    }
  }

  /**
   * Handle tick/quote update and aggregate into bars
   * @private
   */
  handleTickUpdate(message) {
    const { symbol, price, volume, timestamp } = message;

    // Find matching subscriptions and aggregate
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.symbol === symbol) {
        const time = this.parseTime(timestamp);
        const barTime = this.getBarTime(time, subscription.interval);

        if (!subscription.currentBar || subscription.currentBar.time !== barTime) {
          // New bar period
          subscription.currentBar = {
            time: barTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: volume || 0
          };
        } else {
          // Update existing bar
          subscription.currentBar.high = Math.max(subscription.currentBar.high, price);
          subscription.currentBar.low = Math.min(subscription.currentBar.low, price);
          subscription.currentBar.close = price;
          if (volume) {
            subscription.currentBar.volume += volume;
          }
        }

        subscription.callback({ ...subscription.currentBar });
      }
    }
  }

  /**
   * Get bar start time for interval
   * @private
   */
  getBarTime(timestamp, interval) {
    const intervalSeconds = this.intervalToSeconds(interval);
    return Math.floor(timestamp / intervalSeconds) * intervalSeconds;
  }

  /**
   * Convert interval to seconds
   * @private
   */
  intervalToSeconds(interval) {
    if (interval.endsWith('D')) return 86400;
    if (interval.endsWith('W')) return 604800;
    if (interval.endsWith('M')) return 2592000;
    return parseInt(interval) * 60; // Minutes
  }

  /**
   * Parse time to Unix timestamp (seconds)
   * @private
   */
  parseTime(time) {
    if (typeof time === 'number') {
      // Assume Unix timestamp
      return time > 10000000000 ? Math.floor(time / 1000) : time;
    }

    // Parse date string
    return Math.floor(new Date(time).getTime() / 1000);
  }

  /**
   * Send message to WebSocket
   * @private
   */
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, message not sent');
      return;
    }

    const json = JSON.stringify(message);
    this.ws.send(json);
  }

  /**
   * Attempt to reconnect after connection loss
   * @private
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.initialize().then(() => {
        console.log('Reconnected successfully');

        // Re-subscribe to all active subscriptions
        const symbols = new Set();
        for (const [id, sub] of this.subscriptions) {
          symbols.add(sub.symbol);
        }

        for (const symbol of symbols) {
          this.subscribeSymbol(symbol);
        }

      }).catch(error => {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, this.reconnectDelay);
  }

  /**
   * Search for symbols (optional)
   * @param {string} query - Search term
   * @returns {Promise<Array<SymbolInfo>>}
   */
  async searchSymbols(query) {
    try {
      const url = `${this.apiUrl}/search?q=${encodeURIComponent(query)}`;

      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform to OakView format
      // TODO: Adjust based on your API response
      return data.results.map(item => ({
        symbol: item.symbol,
        name: item.name || item.description,
        exchange: item.exchange,
        type: item.type || 'stock'
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
    console.log('Disconnecting WebSocket...');

    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unsubscribe all
    const subscriptionIds = Array.from(this.subscriptions.keys());
    subscriptionIds.forEach(id => this.unsubscribe(id));

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connected = false;
    this.connecting = false;
    this.subscribedSymbols.clear();
  }
}

export default CustomWebSocketProvider;
