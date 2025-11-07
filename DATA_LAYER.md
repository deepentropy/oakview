# OakView Data Layer

## Overview

OakView now includes a flexible data layer architecture that supports both static and streaming data sources. This allows you to use OakView with:
- **Static CSV files** (for demos and backtesting)
- **VoltTrading** (real-time market data via WebSocket)
- **Custom data sources** (implement your own provider)

## Architecture

The data layer uses the **Adapter Pattern** with three main components:

1. **Data Provider Interface** (`OakViewDataProvider`) - Base class that all providers implement
2. **Built-in Providers** - Ready-to-use implementations (CSV, VoltTrading)
3. **Event System** - Events for data requests and symbol changes

```
User Interaction → OakView Events → Data Provider → Chart Update
```

---

## Quick Start

### 1. Static CSV (Unchanged from before)

```html
<oakview-chart-layout
  data-source="SP_SPX, 1D.csv"
  symbol="SPX">
</oakview-chart-layout>
```

### 2. VoltTrading Integration

```javascript
import { VoltTradingProvider } from './src/data-providers/index.js';
import wsService from 'volttrading/services/websocket.js';
import apiService from 'volttrading/services/api.js';

// Create provider
const provider = new VoltTradingProvider({ wsService, apiService });
await provider.initialize();

// Set on layout
const layout = document.querySelector('oakview-chart-layout');
layout.setDataProvider(provider);

// Listen for symbol changes
layout.addEventListener('symbol-change', async (e) => {
  const { symbol, interval } = e.detail;

  // Load historical
  const historical = await provider.fetchHistorical(symbol, interval);
  const chart = layout.getChartAt(0);
  chart.setData(historical);

  // Subscribe to real-time
  provider.subscribe(symbol, interval, (data) => {
    chart.updateRealtime(data);
  });
});
```

### 3. Custom Integration (Event-Driven)

```javascript
layout.addEventListener('data-request', async (e) => {
  e.preventDefault(); // Take manual control
  const { symbol, interval } = e.detail;

  // Your custom data fetching
  const data = await myAPI.fetch(symbol, interval);
  chart.setData(data);
});
```

---

## Data Provider Interface

All providers implement this interface:

```javascript
class OakViewDataProvider {
  // Initialize provider (connect, authenticate, etc.)
  async initialize(config) {}

  // Fetch historical OHLCV data
  async fetchHistorical(symbol, interval, from, to) {
    return [
      { time: 1234567890, open: 100, high: 105, low: 99, close: 102, volume: 1000 }
    ];
  }

  // Subscribe to real-time updates
  subscribe(symbol, interval, callback) {
    // callback receives: { time, open, high, low, close, volume }
    return unsubscribeFunction;
  }

  // Unsubscribe from updates
  unsubscribe(subscriptionId) {}

  // Search for symbols (optional)
  async searchSymbols(query) {
    return [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' }
    ];
  }

  // Cleanup
  disconnect() {}
}
```

---

## Built-in Providers

### CSV Provider

Loads data from CSV files.

```javascript
import { CSVDataProvider } from './src/data-providers/index.js';

const provider = new CSVDataProvider({
  baseUrl: './data/',
  // Optional: custom file pattern
  filePattern: (symbol, interval) => `${symbol}_${interval}.csv`
});

chart.setDataProvider(provider);
```

**CSV Format:**
```csv
time,open,high,low,close,volume
2024-01-01,100.5,101.2,99.8,100.0,1000000
```

### VoltTrading Provider

Integrates with VoltTrading's WebSocket backend.

```javascript
import { VoltTradingProvider } from './src/data-providers/index.js';

const provider = new VoltTradingProvider({
  wsService: voltradingWsService,
  apiService: voltradingApiService
});

await provider.initialize();
chart.setDataProvider(provider);
```

**Features:**
- Historical data via REST API
- Real-time quotes via WebSocket
- Client-side bar aggregation
- Multiple symbol support
- Symbol search integration

---

## API Reference

### OakViewChart Methods

```javascript
// Set data provider
chart.setDataProvider(provider);

// Get data provider
const provider = chart.getDataProvider();

// Set bulk data (replaces all)
chart.setData([{ time, open, high, low, close }]);

// Update with single real-time bar (efficient)
chart.updateRealtime({ time, open, high, low, close });

// Get lightweight-charts instance
const lwChart = chart.getChart();
```

### OakViewChartLayout Methods

```javascript
// Set provider for all charts
layout.setDataProvider(provider);

// Get specific chart
const chart = layout.getChartAt(0);

// Get all charts
const charts = layout.getAllCharts();
```

### Events

```javascript
// Symbol changed (user clicked in search modal)
chart.addEventListener('symbol-change', (e) => {
  console.log(e.detail); // { symbol: 'AAPL', interval: '1D' }
});

// Data request (can be prevented for manual handling)
chart.addEventListener('data-request', (e) => {
  e.preventDefault(); // Take control
  console.log(e.detail); // { symbol: 'AAPL', interval: '1D' }
});

// Interval changed
chart.addEventListener('interval-change', (e) => {
  console.log(e.detail); // { interval: '5', symbol: 'AAPL' }
});
```

---

## Creating Custom Providers

Extend `OakViewDataProvider` and implement the required methods:

```javascript
import { OakViewDataProvider } from './src/data-providers/index.js';

class MyCustomProvider extends OakViewDataProvider {
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
  }

  async initialize() {
    // Setup connection
  }

  async fetchHistorical(symbol, interval, from, to) {
    const response = await fetch(`https://myapi.com/data?symbol=${symbol}`);
    const data = await response.json();

    // Transform to OakView format
    return data.map(bar => ({
      time: bar.timestamp,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v
    }));
  }

  subscribe(symbol, interval, callback) {
    // Setup WebSocket or polling
    const ws = new WebSocket('wss://myapi.com/stream');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback({
        time: data.time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close
      });
    };

    return () => ws.close();
  }
}

// Use it
const provider = new MyCustomProvider({ apiKey: 'xxx' });
chart.setDataProvider(provider);
```

---

## Multiple Symbols

The VoltTrading provider supports multiple symbol subscriptions:

```javascript
// Subscribe to multiple symbols
const symbols = ['AAPL', 'MSFT', 'GOOGL'];

const charts = layout.getAllCharts();
charts.forEach((chart, i) => {
  const symbol = symbols[i];

  // Load historical
  provider.fetchHistorical(symbol, '1D').then(data => {
    chart.setData(data);
  });

  // Subscribe to real-time
  provider.subscribe(symbol, '1D', (data) => {
    chart.updateRealtime(data);
  });
});
```

---

## Migration from Old Version

### Before (v1.0)
```html
<oakview-chart data-source="data.csv"></oakview-chart>
```

### After (v2.0 - Still works!)
```html
<!-- Same code still works -->
<oakview-chart data-source="data.csv"></oakview-chart>

<!-- OR use new provider system -->
<script type="module">
  import { CSVDataProvider } from './src/data-providers/index.js';

  const provider = new CSVDataProvider({ baseUrl: './data/' });
  chart.setDataProvider(provider);
</script>
```

**100% backward compatible!**

---

## Examples

- **Static CSV**: `example/index.html` (unchanged)
- **VoltTrading**: `example/volttrading-demo.html` (with mock services)
- **Custom Integration**: See "Custom Integration" section above

---

## File Structure

```
src/
├── oakview-chart-ui.js         # Main chart component
├── oakview-chart-layout.js     # Layout component
├── data-providers/
│   ├── base.js                 # Base interface
│   ├── csv-provider.js         # CSV implementation
│   ├── volttrading-provider.js # VoltTrading adapter
│   └── index.js                # Exports
└── index.js                    # Main exports

example/
├── index.html                  # CSV demo
└── volttrading-demo.html       # VoltTrading demo
```

---

## Key Benefits

✅ **Flexible** - Static files, REST APIs, WebSockets, or custom sources
✅ **Simple** - CSV usage unchanged, easy for beginners
✅ **Powerful** - Full control with event-driven architecture
✅ **Efficient** - Uses `update()` for real-time, `setData()` for bulk
✅ **Extensible** - Easy to create custom providers
✅ **Compatible** - Backward compatible with existing code
✅ **Production-Ready** - Proven integration with VoltTrading

---

## Next Steps

1. Try the **volttrading-demo.html** to see real-time updates
2. Implement your own provider for your data source
3. Check the TypeScript-style JSDoc for full API documentation
