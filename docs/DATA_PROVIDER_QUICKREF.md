# Data Provider Quick Reference

Quick reference card for implementing OakView data providers.

## Minimal Implementation

```javascript
import { OakViewDataProvider } from 'oakview/dist/oakview.es.js';

class MyProvider extends OakViewDataProvider {
  async initialize(config) {
    // Setup connection
    this.apiKey = config.apiKey;
  }

  async fetchHistorical(symbol, interval, from, to) {
    // Load data from your source
    const response = await fetch(`https://api.example.com/bars?symbol=${symbol}`);
    const data = await response.json();
    
    // Transform to OakView format
    return data.map(bar => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000), // SECONDS!
      open: parseFloat(bar.open),
      high: parseFloat(bar.high),
      low: parseFloat(bar.low),
      close: parseFloat(bar.close),
      volume: parseFloat(bar.volume || 0)
    })).sort((a, b) => a.time - b.time); // ASCENDING!
  }
}
```

## Method Reference

| Method | Required | Purpose |
|--------|----------|---------|
| `initialize(config)` | ✅ Yes | Connect to data source |
| `fetchHistorical(symbol, interval, from?, to?)` | ✅ Yes | Load historical bars |
| `subscribe(symbol, interval, callback)` | Optional | Real-time updates |
| `searchSymbols(query)` | Optional | Symbol search |
| `getAvailableIntervals(symbol)` | Optional | List available timeframes |
| `getBaseInterval(symbol)` | Optional | Get native resolution |
| `hasData(symbol, interval)` | Optional | Check data availability |
| `disconnect()` | Optional | Cleanup resources |

## Data Format

### OHLCV Bar Object

```javascript
{
  time: 1704067200,      // Unix timestamp in SECONDS (not ms!)
  open: 185.14,          // Number
  high: 186.95,          // Number
  low: 184.50,           // Number
  close: 185.64,         // Number
  volume: 52000000       // Number (optional)
}
```

### Symbol Info Object

```javascript
{
  symbol: 'AAPL',        // Ticker (required)
  name: 'Apple Inc.',    // Full name (required)
  exchange: 'NASDAQ',    // Exchange (optional)
  type: 'stock'          // Asset type (optional)
}
```

## Common Mistakes

### ❌ Wrong Time Format
```javascript
time: new Date(bar.date).getTime()  // Milliseconds - WRONG!
```
### ✅ Correct Time Format
```javascript
time: Math.floor(new Date(bar.date).getTime() / 1000)  // Seconds - CORRECT!
```

### ❌ Wrong Sort Order
```javascript
.sort((a, b) => b.time - a.time)  // Descending - WRONG!
```
### ✅ Correct Sort Order
```javascript
.sort((a, b) => a.time - b.time)  // Ascending - CORRECT!
```

### ❌ String Prices
```javascript
{ open: "185.14", close: "185.64" }  // Strings - WRONG!
```
### ✅ Numeric Prices
```javascript
{ open: 185.14, close: 185.64 }  // Numbers - CORRECT!
```

## Real-Time Pattern

```javascript
subscribe(symbol, interval, callback) {
  const ws = new WebSocket('wss://api.example.com/stream');
  
  ws.onmessage = (event) => {
    const tick = JSON.parse(event.data);
    if (tick.symbol === symbol) {
      callback({
        time: Math.floor(Date.now() / 1000),
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume
      });
    }
  };
  
  // IMPORTANT: Return cleanup function
  return () => {
    ws.close();
  };
}
```

## Bar Aggregation Helper

```javascript
class BarAggregator {
  constructor(interval) {
    this.interval = interval;
    this.currentBar = null;
  }
  
  addTick(tick) {
    const barTime = this.getBarTime(tick.timestamp);
    
    if (!this.currentBar || this.currentBar.time !== barTime) {
      // New bar
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
    const seconds = this.intervalToSeconds(this.interval);
    return Math.floor(timestamp / seconds) * seconds;
  }
  
  intervalToSeconds(interval) {
    if (interval.endsWith('D')) return 86400;   // Day
    if (interval.endsWith('W')) return 604800;  // Week
    if (interval.endsWith('M')) return 2592000; // Month (~30 days)
    return parseInt(interval) * 60;              // Minutes
  }
}
```

## Debugging Checklist

When chart doesn't display data:

- [ ] Is time in **seconds** (not milliseconds)?
- [ ] Is data sorted **ascending** (oldest first)?
- [ ] Are prices **numbers** (not strings)?
- [ ] Did `fetchHistorical()` return an array?
- [ ] Are all OHLC values present and valid?
- [ ] Did you call `chart.setDataProvider(provider)`?

## Complete Examples

See these files for full implementations:

- **CSV Static Data**: `examples/csv-example/providers/csv-provider.js`
- **WebSocket Template**: `examples/websocket-example/providers/custom-websocket-provider.js`
- **Production Example**: `examples/volttrading-integration/volttrading-provider.js`

## Full Documentation

For complete guide with all methods, patterns, and examples:

📖 See `docs/DATA_PROVIDER_GUIDE.md`

## Usage

```javascript
// Create provider instance
const provider = new MyProvider();

// Initialize
await provider.initialize({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Set on chart
const chart = document.getElementById('chart');
chart.setDataProvider(provider);
```

## Helper: Convert Common Formats

### Convert milliseconds to seconds
```javascript
const seconds = Math.floor(milliseconds / 1000);
```

### Convert ISO date string to seconds
```javascript
const seconds = Math.floor(new Date(isoString).getTime() / 1000);
```

### Convert YYYY-MM-DD to seconds
```javascript
const seconds = Math.floor(new Date(dateString + 'T00:00:00Z').getTime() / 1000);
```

### Parse various date formats
```javascript
function parseTime(value) {
  if (typeof value === 'number') {
    // Already a number - check if milliseconds
    return value > 10000000000 ? Math.floor(value / 1000) : value;
  }
  
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }
  
  if (typeof value === 'string') {
    return Math.floor(new Date(value).getTime() / 1000);
  }
  
  return NaN;
}
```

## Interval Formats

OakView uses these interval formats:

| Format | Meaning |
|--------|---------|
| `1m`, `5m`, `15m`, `30m` | Minutes |
| `1h`, `2h`, `4h` | Hours |
| `1D` | Daily |
| `1W` | Weekly |
| `1M` | Monthly |

Your provider can convert to/from your API's format in `fetchHistorical()`.
