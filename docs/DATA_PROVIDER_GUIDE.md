# OakView Data Provider Implementation Guide

Complete guide for implementing custom data providers for OakView charts.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Base Class Methods](#base-class-methods)
- [Common Patterns](#common-patterns)
- [Real-World Examples](#real-world-examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

A **Data Provider** is a class that connects OakView to your data source. It handles:

1. **Historical Data**: Loading past OHLCV bars
2. **Real-time Updates**: Streaming live price updates (optional)
3. **Symbol Search**: Finding tradable instruments (optional)
4. **Metadata**: Available timeframes and data availability (optional)

### Architecture

```
┌─────────────────┐
│   OakView       │
│   Component     │
└────────┬────────┘
         │ setDataProvider()
         ▼
┌─────────────────┐
│  Your Custom    │
│  Data Provider  │  ← Extends OakViewDataProvider
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Your Backend   │
│  (REST/WS/CSV)  │
└─────────────────┘
```

---

## Quick Start

### Minimal Implementation

The absolute minimum you need:

```javascript
import { OakViewDataProvider } from 'oakview/dist/oakview.es.js';

class MinimalProvider extends OakViewDataProvider {
  async initialize(config) {
    this.baseUrl = config.baseUrl;
  }

  async fetchHistorical(symbol, interval, from, to) {
    const response = await fetch(`${this.baseUrl}/history?symbol=${symbol}`);
    const data = await response.json();
    
    return data.map(bar => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume
    }));
  }
}

// Usage
const provider = new MinimalProvider();
await provider.initialize({ baseUrl: 'https://api.example.com' });

const chart = document.getElementById('chart');
chart.setDataProvider(provider);
```

### Full-Featured Implementation

For production use with all features:

```javascript
class FullProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.ws = null;
    this.subscriptions = new Map();
  }

  // REQUIRED: Initialize connection
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    
    // Connect WebSocket for real-time data
    this.ws = new WebSocket(config.wsUrl);
    await new Promise(resolve => {
      this.ws.onopen = resolve;
    });
  }

  // REQUIRED: Fetch historical data
  async fetchHistorical(symbol, interval, from, to) {
    const url = `${this.baseUrl}/history?symbol=${symbol}&interval=${interval}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    const data = await response.json();
    
    return data.bars.map(bar => ({
      time: Math.floor(new Date(bar.timestamp).getTime() / 1000),
      open: parseFloat(bar.open),
      high: parseFloat(bar.high),
      low: parseFloat(bar.low),
      close: parseFloat(bar.close),
      volume: parseFloat(bar.volume || 0)
    }));
  }

  // OPTIONAL: Real-time updates
  subscribe(symbol, interval, callback) {
    const subscriptionId = `${symbol}_${interval}`;
    
    // Setup WebSocket listener
    const listener = (event) => {
      const data = JSON.parse(event.data);
      if (data.symbol === symbol) {
        callback({
          time: Math.floor(Date.now() / 1000),
          open: data.price,
          high: data.price,
          low: data.price,
          close: data.price,
          volume: data.volume
        });
      }
    };
    
    this.ws.addEventListener('message', listener);
    this.subscriptions.set(subscriptionId, listener);
    
    // Send subscribe message
    this.ws.send(JSON.stringify({
      action: 'subscribe',
      symbol: symbol
    }));
    
    // Return unsubscribe function
    return () => {
      this.ws.removeEventListener('message', listener);
      this.subscriptions.delete(subscriptionId);
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        symbol: symbol
      }));
    };
  }

  // OPTIONAL: Symbol search
  async searchSymbols(query) {
    const response = await fetch(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
    );
    const results = await response.json();
    
    return results.map(r => ({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange,
      type: r.type
    }));
  }

  // OPTIONAL: Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

---

## Base Class Methods

### Required Methods

#### `initialize(config): Promise<void>`

**Purpose**: Setup and connect to your data source.

**Called**: Once when the provider is first set on the chart.

**Parameters**:
- `config` (Object): Your custom configuration

**Example**:
```javascript
async initialize(config) {
  this.apiKey = config.apiKey;
  this.baseUrl = config.baseUrl;
  
  // Validate connection
  const response = await fetch(`${this.baseUrl}/ping`);
  if (!response.ok) {
    throw new Error('Failed to connect to API');
  }
}
```

---

#### `fetchHistorical(symbol, interval, from?, to?): Promise<OHLCVData[]>`

**Purpose**: Load historical OHLCV bars for a symbol.

**Called**: When the chart loads or when the user changes symbol/interval.

**Parameters**:
- `symbol` (string): Ticker symbol (e.g., 'AAPL', 'SPX')
- `interval` (string): Timeframe (e.g., '1m', '5m', '1h', '1D', '1W')
- `from` (number, optional): Start Unix timestamp in **seconds**
- `to` (number, optional): End Unix timestamp in **seconds**

**Returns**: Array of OHLCV objects sorted in **ascending order**

**IMPORTANT**: 
- Time must be Unix timestamp in **seconds** (not milliseconds!) for intraday
- Time can be BusinessDay `{ year, month, day }` for daily+ data
- Data must be sorted ascending (oldest first)
- Remove duplicate timestamps

**Example**:
```javascript
async fetchHistorical(symbol, interval, from = null, to = null) {
  // Build URL with parameters
  let url = `${this.baseUrl}/bars?symbol=${symbol}&interval=${interval}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Transform and sort data
  const bars = data.bars
    .map(bar => ({
      time: Math.floor(new Date(bar.timestamp).getTime() / 1000), // SECONDS!
      open: parseFloat(bar.open),
      high: parseFloat(bar.high),
      low: parseFloat(bar.low),
      close: parseFloat(bar.close),
      volume: parseFloat(bar.volume || 0)
    }))
    .sort((a, b) => a.time - b.time); // Sort ascending
  
  return bars;
}
```

**Common Mistakes**:
```javascript
// ❌ WRONG: Milliseconds instead of seconds
time: new Date(bar.date).getTime() // 1704067200000

// ✅ CORRECT: Seconds
time: Math.floor(new Date(bar.date).getTime() / 1000) // 1704067200

// ❌ WRONG: Descending order (newest first)
.sort((a, b) => b.time - a.time)

// ✅ CORRECT: Ascending order (oldest first)
.sort((a, b) => a.time - b.time)

// ❌ WRONG: String prices
open: bar.open // "185.14"

// ✅ CORRECT: Numeric prices
open: parseFloat(bar.open) // 185.14
```

---

### Optional Methods

#### `subscribe(symbol, interval, callback): Function`

**Purpose**: Stream real-time price updates.

**Called**: When the chart wants live data (after loading historical).

**Parameters**:
- `symbol` (string): Symbol to subscribe to
- `interval` (string): Timeframe for bar aggregation
- `callback` (Function): Call this with new bars `callback(ohlcvData)`

**Returns**: Unsubscribe function

**Example**:
```javascript
subscribe(symbol, interval, callback) {
  const ws = new WebSocket('wss://api.example.com/stream');
  
  ws.onmessage = (event) => {
    const tick = JSON.parse(event.data);
    
    if (tick.symbol === symbol) {
      // Aggregate ticks into bars
      const bar = this.aggregateTick(tick, interval);
      
      // Call OakView's callback
      callback({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume
      });
    }
  };
  
  // Return cleanup function
  return () => {
    ws.close();
  };
}
```

**Bar Aggregation Pattern**:
```javascript
aggregateTick(tick, interval) {
  const barTime = this.getBarTime(tick.timestamp, interval);
  
  if (!this.currentBar || this.currentBar.time !== barTime) {
    // Start new bar
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
  
  return this.currentBar;
}

getBarTime(timestamp, interval) {
  const seconds = this.intervalToSeconds(interval);
  return Math.floor(timestamp / seconds) * seconds;
}

intervalToSeconds(interval) {
  if (interval.endsWith('D')) return 86400;
  if (interval.endsWith('W')) return 604800;
  if (interval.endsWith('M')) return 2592000;
  return parseInt(interval) * 60; // Minutes
}
```

---

#### `searchSymbols(query): Promise<SymbolInfo[]>`

**Purpose**: Search for tradable symbols.

**Called**: When user types in symbol search box.

**Parameters**:
- `query` (string): Search term (e.g., 'AAPL', 'Apple', 'tech')

**Returns**: Array of matching symbols

**Example**:
```javascript
async searchSymbols(query) {
  const response = await fetch(
    `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
  );
  const results = await response.json();
  
  return results.map(r => ({
    symbol: r.ticker,           // REQUIRED: 'AAPL'
    name: r.companyName,         // REQUIRED: 'Apple Inc.'
    exchange: r.exchange,        // OPTIONAL: 'NASDAQ'
    type: r.assetType            // OPTIONAL: 'stock', 'etf', 'future'
  }));
}
```

---

#### `getAvailableIntervals(symbol): string[] | null`

**Purpose**: Tell OakView which intervals are available for a symbol.

**Called**: When changing symbols to update the interval dropdown.

**Returns**: 
- `Array<string>`: Available intervals (e.g., `['1m', '5m', '1D']`)
- `null`: All intervals available (default)

**Use Case**: CSV files with specific intervals, or API with limited data.

**Example**:
```javascript
getAvailableIntervals(symbol) {
  // CSV provider: Only show intervals for which we have files
  const intervals = this.files
    .filter(f => f.symbol === symbol)
    .map(f => f.interval);
  
  return intervals; // ['1D', '1W']
}
```

---

#### `getBaseInterval(symbol): string | null`

**Purpose**: Indicate the native resolution of your data.

**Called**: For informational purposes (e.g., to show "resampled" indicator).

**Returns**:
- `string`: Base interval (e.g., '1m', '1D')
- `null`: Unknown/not applicable

**Example**:
```javascript
getBaseInterval(symbol) {
  // If your API always provides minute data
  return '1m';
  
  // Or for CSV provider: return finest granularity
  const intervals = this.getAvailableIntervals(symbol);
  return intervals[0]; // Assuming sorted by granularity
}
```

---

#### `hasData(symbol, interval): boolean`

**Purpose**: Check if data exists for a symbol/interval combination.

**Called**: To disable unavailable intervals in the UI.

**Returns**: `true` if data available, `false` otherwise

**Example**:
```javascript
hasData(symbol, interval) {
  // CSV provider: Check if file exists
  return this.files.some(f => 
    f.symbol === symbol && f.interval === interval
  );
  
  // API provider: Check supported combinations
  const supported = this.supportedIntervals.get(symbol) || [];
  return supported.includes(interval);
}
```

---

#### `disconnect(): void`

**Purpose**: Cleanup resources when provider is no longer needed.

**Called**: When chart is destroyed or provider is changed.

**Example**:
```javascript
disconnect() {
  // Close WebSocket
  if (this.ws) {
    this.ws.close();
    this.ws = null;
  }
  
  // Clear subscriptions
  this.subscriptions.clear();
  
  // Cancel pending requests
  this.abortController.abort();
}
```

---

## Common Patterns

### Pattern 1: REST API Only (No Real-time)

```javascript
class RESTProvider extends OakViewDataProvider {
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  async fetchHistorical(symbol, interval, from, to) {
    const response = await fetch(`${this.baseUrl}/bars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ symbol, interval, from, to })
    });
    
    const data = await response.json();
    return this.transformData(data);
  }

  transformData(data) {
    return data.map(bar => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: parseFloat(bar.o),
      high: parseFloat(bar.h),
      low: parseFloat(bar.l),
      close: parseFloat(bar.c),
      volume: parseFloat(bar.v || 0)
    })).sort((a, b) => a.time - b.time);
  }
}
```

---

### Pattern 2: WebSocket with Bar Aggregation

```javascript
class WebSocketProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.ws = null;
    this.currentBars = new Map(); // symbol_interval -> bar
  }

  async initialize(config) {
    this.ws = new WebSocket(config.wsUrl);
    
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }

  async fetchHistorical(symbol, interval, from, to) {
    // Fetch from REST API
    const response = await fetch(`${this.baseUrl}/history`);
    const data = await response.json();
    return this.transformData(data);
  }

  subscribe(symbol, interval, callback) {
    const key = `${symbol}_${interval}`;
    
    const listener = (event) => {
      const tick = JSON.parse(event.data);
      if (tick.symbol !== symbol) return;
      
      const barTime = this.getBarTime(tick.timestamp, interval);
      let bar = this.currentBars.get(key);
      
      if (!bar || bar.time !== barTime) {
        // New bar
        bar = {
          time: barTime,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume || 0
        };
        this.currentBars.set(key, bar);
      } else {
        // Update bar
        bar.high = Math.max(bar.high, tick.price);
        bar.low = Math.min(bar.low, tick.price);
        bar.close = tick.price;
        bar.volume += tick.volume || 0;
      }
      
      callback({ ...bar });
    };
    
    this.ws.addEventListener('message', listener);
    
    // Send subscribe message
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      symbol: symbol
    }));
    
    return () => {
      this.ws.removeEventListener('message', listener);
      this.currentBars.delete(key);
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbol: symbol
      }));
    };
  }

  getBarTime(timestamp, interval) {
    const seconds = this.intervalToSeconds(interval);
    return Math.floor(timestamp / seconds) * seconds;
  }

  intervalToSeconds(interval) {
    if (interval.endsWith('D')) return 86400;
    if (interval.endsWith('W')) return 604800;
    return parseInt(interval) * 60;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

---

### Pattern 3: CSV Files (Static Data)

```javascript
class CSVProvider extends OakViewDataProvider {
  constructor(config) {
    super();
    this.baseUrl = config.baseUrl;
    this.files = config.files; // [{ symbol: 'AAPL', interval: '1D', filename: 'AAPL_1D.csv' }]
    this.cache = new Map();
  }

  async initialize(config) {
    console.log(`CSV Provider initialized with ${this.files.length} files`);
  }

  async fetchHistorical(symbol, interval, from, to) {
    const key = `${symbol}_${interval}`;
    
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Find file
    const file = this.files.find(f => 
      f.symbol === symbol && f.interval === interval
    );
    
    if (!file) {
      throw new Error(`No data for ${symbol} at ${interval}`);
    }
    
    // Load CSV
    const url = `${this.baseUrl}/${file.filename}`;
    const data = await this.loadCSV(url);
    
    // Cache and return
    this.cache.set(key, data);
    return data;
  }

  async loadCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const data = results.data
            .filter(row => row.time && row.close)
            .map(row => ({
              time: Math.floor(new Date(row.time).getTime() / 1000),
              open: parseFloat(row.open),
              high: parseFloat(row.high),
              low: parseFloat(row.low),
              close: parseFloat(row.close),
              volume: parseFloat(row.volume || 0)
            }))
            .sort((a, b) => a.time - b.time);
          
          resolve(data);
        },
        error: (error) => reject(error)
      });
    });
  }

  getAvailableIntervals(symbol) {
    return this.files
      .filter(f => f.symbol === symbol)
      .map(f => f.interval);
  }

  hasData(symbol, interval) {
    return this.files.some(f => 
      f.symbol === symbol && f.interval === interval
    );
  }

  async searchSymbols(query) {
    const symbols = [...new Set(this.files.map(f => f.symbol))];
    const filtered = query 
      ? symbols.filter(s => s.toLowerCase().includes(query.toLowerCase()))
      : symbols;
    
    return filtered.map(symbol => ({
      symbol,
      name: symbol,
      exchange: 'CSV',
      type: 'data'
    }));
  }
}
```

---

## Real-World Examples

### Example 1: Polygon.io Integration

```javascript
class PolygonProvider extends OakViewDataProvider {
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = 'https://api.polygon.io';
  }

  async fetchHistorical(symbol, interval, from, to) {
    // Convert interval format
    const [multiplier, timespan] = this.parseInterval(interval);
    
    // Default to last 2 years if no range specified
    const end = to || Math.floor(Date.now() / 1000);
    const start = from || (end - 2 * 365 * 24 * 60 * 60);
    
    const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${start * 1000}/${end * 1000}?apiKey=${this.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results) {
      throw new Error(`No data for ${symbol}`);
    }
    
    return data.results.map(bar => ({
      time: Math.floor(bar.t / 1000), // Polygon uses milliseconds
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v
    }));
  }

  parseInterval(interval) {
    // '1m' -> [1, 'minute']
    // '1D' -> [1, 'day']
    const match = interval.match(/^(\d+)([mhDWM])$/);
    if (!match) return [1, 'day'];
    
    const [, multiplier, unit] = match;
    const timespan = {
      'm': 'minute',
      'h': 'hour',
      'D': 'day',
      'W': 'week',
      'M': 'month'
    }[unit] || 'day';
    
    return [parseInt(multiplier), timespan];
  }

  async searchSymbols(query) {
    const response = await fetch(
      `${this.baseUrl}/v3/reference/tickers?search=${query}&apiKey=${this.apiKey}`
    );
    const data = await response.json();
    
    return (data.results || []).map(r => ({
      symbol: r.ticker,
      name: r.name,
      exchange: r.primary_exchange,
      type: r.type
    }));
  }
}
```

---

### Example 2: Alpha Vantage Integration

```javascript
class AlphaVantageProvider extends OakViewDataProvider {
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = 'https://www.alphavantage.co';
  }

  async fetchHistorical(symbol, interval, from, to) {
    const function_name = this.getFunction(interval);
    const url = `${this.baseUrl}/query?function=${function_name}&symbol=${symbol}&apikey=${this.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Alpha Vantage has different response formats
    const timeSeriesKey = Object.keys(data).find(k => k.includes('Time Series'));
    if (!timeSeriesKey) {
      throw new Error('Invalid response from Alpha Vantage');
    }
    
    const timeSeries = data[timeSeriesKey];
    
    return Object.entries(timeSeries)
      .map(([date, values]) => ({
        time: Math.floor(new Date(date).getTime() / 1000),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume'] || 0)
      }))
      .sort((a, b) => a.time - b.time);
  }

  getFunction(interval) {
    if (interval === '1m') return 'TIME_SERIES_INTRADAY&interval=1min';
    if (interval === '5m') return 'TIME_SERIES_INTRADAY&interval=5min';
    if (interval === '1D') return 'TIME_SERIES_DAILY';
    if (interval === '1W') return 'TIME_SERIES_WEEKLY';
    return 'TIME_SERIES_DAILY';
  }

  async searchSymbols(query) {
    const response = await fetch(
      `${this.baseUrl}/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${this.apiKey}`
    );
    const data = await response.json();
    
    return (data.bestMatches || []).map(match => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      exchange: match['4. region'],
      type: match['3. type']
    }));
  }
}
```

---

## Troubleshooting

### Issue 1: Chart Shows "No data"

**Symptoms**: Chart is empty, no bars displayed

**Causes**:
1. ❌ Time in milliseconds instead of seconds
2. ❌ Data not sorted ascending
3. ❌ Invalid time format
4. ❌ `fetchHistorical()` returning empty array

**Debug**:
```javascript
async fetchHistorical(symbol, interval, from, to) {
  const data = await this.loadData(symbol, interval);
  
  console.log('First bar:', data[0]);
  // Should show: { time: 1704067200, open: 185.14, ... }
  // NOT: { time: 1704067200000, ... }  ← milliseconds!
  
  console.log('Is sorted?', data.every((bar, i) => 
    i === 0 || bar.time > data[i-1].time
  ));
  // Should be true
  
  return data;
}
```

**Fix**:
```javascript
// Convert milliseconds to seconds
time: Math.floor(timestamp / 1000)

// Ensure ascending sort
.sort((a, b) => a.time - b.time)
```

---

### Issue 2: Intervals Don't Show in Dropdown

**Symptoms**: Interval dropdown is empty or disabled

**Cause**: `getAvailableIntervals()` returning wrong format

**Debug**:
```javascript
getAvailableIntervals(symbol) {
  const intervals = this.getIntervalsForSymbol(symbol);
  console.log('Available intervals:', intervals);
  // Should return array like: ['1m', '5m', '1D']
  // NOT: null, undefined, or single string
  
  return intervals;
}
```

**Fix**:
```javascript
// Return array
return ['1m', '5m', '1h', '1D'];

// OR return null for "all intervals available"
return null;
```

---

### Issue 3: Real-time Updates Don't Work

**Symptoms**: Historical data loads, but no live updates

**Causes**:
1. ❌ Not calling callback
2. ❌ Wrong data format in callback
3. ❌ Not returning unsubscribe function

**Debug**:
```javascript
subscribe(symbol, interval, callback) {
  const listener = (tick) => {
    console.log('Received tick:', tick);
    
    const bar = {
      time: Math.floor(Date.now() / 1000),
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.volume
    };
    
    console.log('Calling callback with:', bar);
    callback(bar); // ← Must call this!
  };
  
  this.ws.on('message', listener);
  
  return () => {
    console.log('Unsubscribing');
    this.ws.off('message', listener);
  };
}
```

---

### Issue 4: "Cannot update oldest data" Error

**Symptoms**: Error in console when receiving updates

**Cause**: Real-time bar has older timestamp than last historical bar

**Fix**: Ensure real-time timestamps are newer than historical:
```javascript
subscribe(symbol, interval, callback) {
  // Get last historical bar time
  const lastHistoricalTime = this.getLastBarTime(symbol, interval);
  
  const listener = (tick) => {
    const barTime = this.getBarTime(tick.timestamp, interval);
    
    // Only send updates for bars after last historical
    if (barTime > lastHistoricalTime) {
      callback({
        time: barTime,
        // ...
      });
    }
  };
  
  // ...
}
```

---

### Issue 5: Duplicate Timestamps

**Symptoms**: Warnings about duplicate times, erratic chart behavior

**Cause**: Multiple bars with same timestamp

**Fix**: Deduplicate before returning:
```javascript
async fetchHistorical(symbol, interval, from, to) {
  let data = await this.loadRawData(symbol, interval);
  
  // Remove duplicates (keep last occurrence)
  const seen = new Map();
  data.forEach(bar => seen.set(bar.time, bar));
  data = Array.from(seen.values()).sort((a, b) => a.time - b.time);
  
  return data;
}
```

---

## Performance Tips

### 1. Cache Historical Data

```javascript
constructor() {
  super();
  this.cache = new Map();
}

async fetchHistorical(symbol, interval, from, to) {
  const key = `${symbol}_${interval}`;
  
  if (this.cache.has(key)) {
    return this.cache.get(key);
  }
  
  const data = await this.loadData(symbol, interval);
  this.cache.set(key, data);
  return data;
}
```

### 2. Batch Symbol Subscriptions

```javascript
subscribe(symbol, interval, callback) {
  // Add to pending subscriptions
  this.pendingSubscriptions.push({ symbol, callback });
  
  // Batch subscribe every 100ms
  clearTimeout(this.subscribeTimer);
  this.subscribeTimer = setTimeout(() => {
    const symbols = this.pendingSubscriptions.map(s => s.symbol);
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      symbols: symbols
    }));
    this.pendingSubscriptions = [];
  }, 100);
  
  // ...
}
```

### 3. Use AbortController for Fetch

```javascript
async fetchHistorical(symbol, interval, from, to) {
  const controller = new AbortController();
  this.currentRequest = controller;
  
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request cancelled');
      return [];
    }
    throw error;
  }
}

disconnect() {
  if (this.currentRequest) {
    this.currentRequest.abort();
  }
}
```

---

## Next Steps

1. **Start Simple**: Implement just `initialize()` and `fetchHistorical()`
2. **Test with CSV**: Use the CSV provider as a reference
3. **Add Real-time**: Implement `subscribe()` when ready
4. **Optimize**: Add caching, batching, error handling

For complete examples, see:
- `examples/csv-example/providers/csv-provider.js` - Static data
- `examples/volttrading-integration/volttrading-provider.js` - Full production example
- `examples/websocket-example/providers/custom-websocket-provider.js` - Generic template

---

## Questions?

If you're stuck, check:
1. Are times in seconds (not milliseconds)?
2. Is data sorted ascending?
3. Are all required methods implemented?
4. Is the callback being called in `subscribe()`?

Common gotchas documented in the Troubleshooting section above.
