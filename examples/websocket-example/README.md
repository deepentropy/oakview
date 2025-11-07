# OakView WebSocket Example

This example demonstrates how to integrate OakView with real-time WebSocket data streams in your project.

## Features

- Real-time streaming market data via WebSocket
- Historical data loading from REST API
- Live chart updates as new data arrives
- Multiple symbol support
- Symbol search integration
- Automatic reconnection handling

## Prerequisites

- Node.js and npm installed
- A WebSocket data provider (e.g., VoltTrading, your own backend)
- Basic knowledge of HTML, JavaScript, and WebSocket APIs

## Project Structure

```
websocket-example/
├── index.html          # Main HTML file
├── providers/
│   └── custom-websocket-provider.js  # Custom WebSocket provider implementation
├── package.json        # Project dependencies
└── README.md          # This file
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure your WebSocket endpoint (see Configuration section)

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to the URL shown (typically http://localhost:5173)

## Creating a Custom WebSocket Provider

To integrate your WebSocket service, extend the `OakViewDataProvider` base class from the core library:

```javascript
import OakViewDataProvider from '../../src/data-providers/base.js';

class CustomWebSocketProvider extends OakViewDataProvider {
  constructor(config) {
    super();
    this.wsUrl = config.wsUrl;
    this.apiUrl = config.apiUrl;
    this.ws = null;
    this.subscriptions = new Map();
  }

  // Initialize connection
  async initialize(config) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  // Fetch historical data
  async fetchHistorical(symbol, interval, from, to) {
    const url = `${this.apiUrl}/history?symbol=${symbol}&interval=${interval}`;
    const response = await fetch(url);
    const data = await response.json();

    // Transform to OakView format
    return data.map(bar => ({
      time: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume
    }));
  }

  // Subscribe to real-time updates
  subscribe(symbol, interval, callback) {
    const subscriptionId = `${symbol}_${interval}`;

    // Store subscription
    this.subscriptions.set(subscriptionId, {
      symbol,
      interval,
      callback,
      currentBar: null
    });

    // Send subscription message to WebSocket
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      symbol: symbol,
      interval: interval
    }));

    // Return unsubscribe function
    return () => this.unsubscribe(subscriptionId);
  }

  // Handle incoming WebSocket messages
  handleMessage(data) {
    const message = JSON.parse(data);

    // Route message to appropriate subscription
    const subscriptionId = `${message.symbol}_${message.interval}`;
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      // Update or create bar
      const bar = {
        time: message.time,
        open: message.open,
        high: message.high,
        low: message.low,
        close: message.close,
        volume: message.volume
      };

      // Call callback with updated bar
      subscription.callback(bar);
    }
  }

  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default CustomWebSocketProvider;
```

## Integration Guide

### Step 1: Import OakView and Your Provider

```javascript
import '../../src/oakview-chart-layout.js';
import CustomWebSocketProvider from './providers/custom-websocket-provider.js';
```

Note: The `custom-websocket-provider.js` in this example is a comprehensive template. Copy it to your project and customize it for your WebSocket API.

### Step 2: Create the Provider Instance

```javascript
const provider = new CustomWebSocketProvider({
  wsUrl: 'wss://your-websocket-endpoint.com/stream',
  apiUrl: 'https://your-api-endpoint.com/api'
});
```

### Step 3: Initialize the Provider

```javascript
try {
  await provider.initialize();
  console.log('WebSocket provider connected');
} catch (error) {
  console.error('Failed to connect:', error);
}
```

### Step 4: Add the Chart Component

```html
<oakview-chart-layout
  id="chart"
  symbol="AAPL"
  interval="1D"
  theme="dark">
</oakview-chart-layout>
```

### Step 5: Connect the Provider

```javascript
const chart = document.getElementById('chart');
chart.setDataProvider(provider);
```

## WebSocket Message Format

Your WebSocket should send messages in this format:

### Real-time Quote/Bar Update

```json
{
  "type": "bar",
  "symbol": "AAPL",
  "interval": "1D",
  "time": 1704067200,
  "open": 185.14,
  "high": 186.95,
  "low": 184.50,
  "close": 185.64,
  "volume": 52000000
}
```

### Subscription Confirmation

```json
{
  "type": "subscribed",
  "symbol": "AAPL",
  "interval": "1D",
  "status": "success"
}
```

### Error Message

```json
{
  "type": "error",
  "message": "Invalid symbol",
  "code": "INVALID_SYMBOL"
}
```

## Advanced Features

### Bar Aggregation from Ticks

If your WebSocket provides tick data (individual trades), you'll need to aggregate them into OHLCV bars:

```javascript
class TickAggregator {
  constructor(interval) {
    this.interval = interval;
    this.currentBar = null;
  }

  addTick(tick) {
    const barTime = this.getBarTime(tick.time);

    if (!this.currentBar || this.currentBar.time !== barTime) {
      // New bar period
      this.currentBar = {
        time: barTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume || 0
      };
    } else {
      // Update existing bar
      this.currentBar.high = Math.max(this.currentBar.high, tick.price);
      this.currentBar.low = Math.min(this.currentBar.low, tick.price);
      this.currentBar.close = tick.price;
      this.currentBar.volume += tick.volume || 0;
    }

    return { ...this.currentBar };
  }

  getBarTime(timestamp) {
    const intervalSeconds = this.intervalToSeconds(this.interval);
    return Math.floor(timestamp / intervalSeconds) * intervalSeconds;
  }

  intervalToSeconds(interval) {
    if (interval.endsWith('D')) return 86400;
    if (interval.endsWith('W')) return 604800;
    if (interval.endsWith('M')) return 2592000;
    return parseInt(interval) * 60; // Minutes
  }
}
```

### Reconnection Logic

Implement automatic reconnection for better reliability:

```javascript
class WebSocketWithReconnect {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectAttempts = 0;
    this.ws = null;
    this.messageHandlers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onmessage = (event) => {
        this.messageHandlers.forEach(handler => handler(event.data));
      };
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

### Multiple Symbol Management

Handle multiple symbols efficiently:

```javascript
class SymbolManager {
  constructor(ws) {
    this.ws = ws;
    this.subscriptions = new Map();
    this.symbolRefCounts = new Map();
  }

  subscribe(symbol, interval, callback) {
    const key = `${symbol}_${interval}`;

    // Store subscription
    this.subscriptions.set(key, callback);

    // Track reference count
    const refCount = this.symbolRefCounts.get(symbol) || 0;
    this.symbolRefCounts.set(symbol, refCount + 1);

    // Subscribe only if first subscriber
    if (refCount === 0) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        symbol: symbol,
        interval: interval
      }));
    }

    return key;
  }

  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const [symbol] = subscriptionId.split('_');

    // Remove subscription
    this.subscriptions.delete(subscriptionId);

    // Decrease reference count
    const refCount = this.symbolRefCounts.get(symbol) || 0;
    if (refCount <= 1) {
      // Last subscriber, unsubscribe from WebSocket
      this.symbolRefCounts.delete(symbol);
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbol: symbol
      }));
    } else {
      this.symbolRefCounts.set(symbol, refCount - 1);
    }
  }
}
```

## Authentication

If your WebSocket requires authentication:

```javascript
async initialize(config) {
  // Get auth token
  const token = await this.authenticate(config.apiKey, config.apiSecret);

  return new Promise((resolve, reject) => {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      // Send authentication message
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'auth_success') {
        console.log('Authenticated successfully');
        resolve();
      } else if (message.type === 'auth_error') {
        reject(new Error('Authentication failed'));
      } else {
        this.handleMessage(event.data);
      }
    };
  });
}

async authenticate(apiKey, apiSecret) {
  const response = await fetch(`${this.apiUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, apiSecret })
  });

  const data = await response.json();
  return data.token;
}
```

## Error Handling

Implement robust error handling:

```javascript
// In your provider class
handleError(error) {
  console.error('Provider error:', error);

  // Notify all subscriptions about the error
  for (const [id, subscription] of this.subscriptions) {
    if (subscription.errorCallback) {
      subscription.errorCallback(error);
    }
  }

  // Attempt to recover
  if (error.type === 'connection_lost') {
    this.reconnect();
  }
}

// When subscribing, allow error callbacks
subscribe(symbol, interval, callback, errorCallback) {
  const subscriptionId = `${symbol}_${interval}`;

  this.subscriptions.set(subscriptionId, {
    symbol,
    interval,
    callback,
    errorCallback
  });

  // ... rest of subscription logic
}
```

## Performance Optimization

### Throttling Updates

Limit update frequency to improve performance:

```javascript
class UpdateThrottler {
  constructor(minInterval = 100) {
    this.minInterval = minInterval;
    this.lastUpdate = 0;
    this.pendingUpdate = null;
    this.timer = null;
  }

  throttle(callback, data) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdate;

    if (timeSinceLastUpdate >= this.minInterval) {
      // Enough time has passed, update immediately
      callback(data);
      this.lastUpdate = now;
      this.pendingUpdate = null;
    } else {
      // Store pending update
      this.pendingUpdate = data;

      // Schedule update
      if (!this.timer) {
        const delay = this.minInterval - timeSinceLastUpdate;
        this.timer = setTimeout(() => {
          if (this.pendingUpdate) {
            callback(this.pendingUpdate);
            this.lastUpdate = Date.now();
            this.pendingUpdate = null;
          }
          this.timer = null;
        }, delay);
      }
    }
  }
}

// Usage
const throttler = new UpdateThrottler(100); // Max 10 updates/sec

subscribe(symbol, interval, callback) {
  const throttledCallback = (data) => {
    throttler.throttle(callback, data);
  };

  // ... use throttledCallback instead of callback
}
```

## Testing Your Provider

Create a simple test script:

```javascript
// test-provider.js
import CustomWebSocketProvider from './providers/custom-websocket-provider.js';

async function testProvider() {
  const provider = new CustomWebSocketProvider({
    wsUrl: 'wss://your-endpoint.com/stream',
    apiUrl: 'https://your-endpoint.com/api'
  });

  try {
    // Test connection
    console.log('Connecting...');
    await provider.initialize();
    console.log('✓ Connected');

    // Test historical data
    console.log('Fetching historical data...');
    const history = await provider.fetchHistorical('AAPL', '1D');
    console.log(`✓ Loaded ${history.length} bars`);

    // Test subscription
    console.log('Testing real-time subscription...');
    const unsubscribe = provider.subscribe('AAPL', '1D', (bar) => {
      console.log('Received bar update:', bar);
    });

    // Run for 30 seconds
    setTimeout(() => {
      console.log('Unsubscribing...');
      unsubscribe();
      provider.disconnect();
      console.log('✓ Test complete');
    }, 30000);

  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

testProvider();
```

## VoltTrading Provider Example

If you're using VoltTrading, you can use the included example provider as a starting point:

```javascript
import VoltTradingProvider from './providers/volttrading-provider.js';
import { VoltTradingWSService, VoltTradingAPIService } from 'volttrading-sdk';

const wsService = new VoltTradingWSService({
  url: 'wss://volttrading.com/ws'
});

const apiService = new VoltTradingAPIService({
  url: 'https://volttrading.com/api'
});

const provider = new VoltTradingProvider({
  wsService: wsService,
  apiService: apiService
});

await provider.initialize();
```

## Troubleshooting

### WebSocket Connection Failed

**Solution**: Check:
- WebSocket URL is correct and accessible
- CORS/security settings allow WebSocket connections
- Firewall/proxy settings don't block WebSocket
- Authentication credentials are valid

### No Real-time Updates

**Solution**: Verify:
- WebSocket is sending messages (check browser DevTools > Network > WS)
- Message format matches expected structure
- Subscription was successful
- Symbol is valid and has active trading

### High CPU Usage

**Solution**:
- Implement update throttling (see Performance section)
- Reduce number of simultaneous subscriptions
- Use requestAnimationFrame for chart updates
- Consider downsampling high-frequency data

## Next Steps

- Explore the [CSV Example](../csv-example/) for static data loading
- Check the [API Documentation](../../docs/) for advanced features
- Implement custom indicators and overlays
- Build a complete trading application

## Support

For issues or questions:
- GitHub Issues: [OakView Issues](https://github.com/yourrepo/oakview/issues)
- Documentation: [OakView Docs](../../docs/)
