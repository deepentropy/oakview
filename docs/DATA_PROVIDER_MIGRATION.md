# Data Provider Migration Guide

Quick guide for updating existing providers to use new optional methods.

## What Changed?

The `OakViewDataProvider` base class now includes additional optional methods that were previously only implemented in examples:

- `getAvailableIntervals(symbol)` - List available timeframes for a symbol
- `getBaseInterval(symbol)` - Get the native data resolution
- `hasData(symbol, interval)` - Check if data exists for a combination

## Do I Need to Update?

**No**, your existing provider will continue to work! These methods are **optional** and have sensible defaults.

However, implementing them can improve the user experience.

## Migration Checklist

### ✅ Your Provider Already Works If:

- [x] You implement `initialize(config)`
- [x] You implement `fetchHistorical(symbol, interval, from?, to?)`
- [x] Time values are Unix timestamps in **seconds** (not milliseconds)
- [x] Data is sorted in **ascending** order (oldest first)

### 🎯 Consider Adding (Optional):

- [ ] `subscribe()` for real-time updates
- [ ] `searchSymbols()` for symbol search
- [ ] `getAvailableIntervals()` if you have limited data
- [ ] `getBaseInterval()` to indicate native resolution
- [ ] `hasData()` to disable unavailable intervals in UI

## Quick Fixes for Common Issues

### Issue 1: "Cannot update oldest data" Error

**Cause**: Real-time updates have older timestamps than historical data

**Fix**: Ensure real-time bars have newer timestamps
```javascript
subscribe(symbol, interval, callback) {
  const ws = new WebSocket('...');
  
  ws.onmessage = (event) => {
    const tick = JSON.parse(event.data);
    
    // Make sure time is current
    const currentTime = Math.floor(Date.now() / 1000);
    
    callback({
      time: currentTime, // NOT an old timestamp!
      // ...
    });
  };
  
  return () => ws.close();
}
```

### Issue 2: Chart Shows No Data

**Cause 1**: Time in milliseconds instead of seconds
```javascript
// ❌ WRONG
time: new Date().getTime() // 1704067200000 (milliseconds)

// ✅ CORRECT
time: Math.floor(Date.now() / 1000) // 1704067200 (seconds)
```

**Cause 2**: Data not sorted
```javascript
// ❌ WRONG - descending
.sort((a, b) => b.time - a.time)

// ✅ CORRECT - ascending
.sort((a, b) => a.time - b.time)
```

### Issue 3: Intervals Don't Show Correctly

If you have limited data (e.g., only daily and weekly), implement `getAvailableIntervals()`:

```javascript
getAvailableIntervals(symbol) {
  // Return only intervals you have data for
  return ['1D', '1W'];
  
  // Or return null to show all intervals
  // return null;
}
```

## Adding Optional Methods

### 1. Symbol Search

If your API supports symbol search:

```javascript
async searchSymbols(query) {
  const response = await fetch(`${this.apiUrl}/search?q=${query}`);
  const results = await response.json();
  
  return results.map(r => ({
    symbol: r.ticker,
    name: r.name,
    exchange: r.exchange,
    type: r.type
  }));
}
```

### 2. Real-Time Updates

If you want live data:

```javascript
subscribe(symbol, interval, callback) {
  const ws = new WebSocket(this.wsUrl);
  
  ws.onmessage = (event) => {
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
  
  // IMPORTANT: Return cleanup function
  return () => {
    ws.close();
  };
}
```

### 3. Available Intervals

If you have limited data availability:

```javascript
getAvailableIntervals(symbol) {
  // Example: CSV provider with specific files
  const files = this.files.filter(f => f.symbol === symbol);
  return files.map(f => f.interval);
  
  // Example: API with known intervals
  return ['1m', '5m', '15m', '1h', '1D'];
  
  // Example: All intervals available
  return null;
}
```

### 4. Data Availability Check

If intervals should be disabled when no data exists:

```javascript
hasData(symbol, interval) {
  // Example: CSV provider
  return this.files.some(f => 
    f.symbol === symbol && f.interval === interval
  );
  
  // Example: API provider with known limits
  const supported = {
    'AAPL': ['1m', '5m', '1h', '1D'],
    'SPX': ['1D', '1W']
  };
  return supported[symbol]?.includes(interval) || false;
}
```

### 5. Base Interval

To indicate your native data resolution:

```javascript
getBaseInterval(symbol) {
  // Example: Minute data API
  return '1m';
  
  // Example: CSV provider - return finest granularity
  const intervals = this.getAvailableIntervals(symbol);
  return intervals[0]; // Assuming sorted by granularity
  
  // Example: Not applicable
  return null;
}
```

## Before & After Examples

### Before (Minimal)

```javascript
class MyProvider extends OakViewDataProvider {
  async initialize(config) {
    this.apiKey = config.apiKey;
  }

  async fetchHistorical(symbol, interval, from, to) {
    const response = await fetch(`${this.apiUrl}/bars?symbol=${symbol}`);
    const data = await response.json();
    
    return data.map(bar => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: parseFloat(bar.open),
      high: parseFloat(bar.high),
      low: parseFloat(bar.low),
      close: parseFloat(bar.close),
      volume: parseFloat(bar.volume || 0)
    })).sort((a, b) => a.time - b.time);
  }
}
```

### After (Enhanced)

```javascript
class MyProvider extends OakViewDataProvider {
  async initialize(config) {
    this.apiKey = config.apiKey;
    this.ws = new WebSocket(config.wsUrl);
  }

  async fetchHistorical(symbol, interval, from, to) {
    const response = await fetch(`${this.apiUrl}/bars?symbol=${symbol}&interval=${interval}`);
    const data = await response.json();
    
    return data.map(bar => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: parseFloat(bar.open),
      high: parseFloat(bar.high),
      low: parseFloat(bar.low),
      close: parseFloat(bar.close),
      volume: parseFloat(bar.volume || 0)
    })).sort((a, b) => a.time - b.time);
  }

  // NEW: Real-time updates
  subscribe(symbol, interval, callback) {
    const listener = (event) => {
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
    
    this.ws.addEventListener('message', listener);
    
    return () => {
      this.ws.removeEventListener('message', listener);
    };
  }

  // NEW: Symbol search
  async searchSymbols(query) {
    const response = await fetch(`${this.apiUrl}/search?q=${query}`);
    const results = await response.json();
    
    return results.map(r => ({
      symbol: r.ticker,
      name: r.name,
      exchange: r.exchange,
      type: r.type
    }));
  }

  // NEW: Available intervals (if limited)
  getAvailableIntervals(symbol) {
    // If you support all intervals, return null
    return null;
    
    // Or specify which ones you support
    // return ['1m', '5m', '1h', '1D'];
  }

  // NEW: Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

## Testing Your Provider

### 1. Test Historical Data

```javascript
const provider = new MyProvider();
await provider.initialize({ apiKey: 'xxx' });

const data = await provider.fetchHistorical('AAPL', '1D');
console.log('First bar:', data[0]);
// Should show: { time: 1704067200, open: 185.14, ... }

console.log('Is sorted?', data.every((bar, i) => 
  i === 0 || bar.time > data[i-1].time
));
// Should be: true
```

### 2. Test Real-Time Updates

```javascript
const unsubscribe = provider.subscribe('AAPL', '1D', (bar) => {
  console.log('Received update:', bar);
  // Should show current time and prices
});

// Later
unsubscribe();
```

### 3. Test Symbol Search

```javascript
const results = await provider.searchSymbols('AAPL');
console.log('Search results:', results);
// Should show: [{ symbol: 'AAPL', name: 'Apple Inc.', ... }]
```

## Need Help?

1. Check the [Quick Reference](./DATA_PROVIDER_QUICKREF.md)
2. Read the [Complete Guide](./DATA_PROVIDER_GUIDE.md)
3. Review example providers in `examples/`
4. Look at troubleshooting section in Complete Guide

## Common Questions

**Q: Do I need to update my existing provider?**
A: No, it will continue to work. The new methods are optional.

**Q: What's the minimum I need to implement?**
A: Just `initialize()` and `fetchHistorical()`.

**Q: How do I know if I should add optional methods?**
A: Add them if you want the features they enable (real-time, search, etc.).

**Q: Are there breaking changes?**
A: No, all changes are backwards compatible.

**Q: Where can I see complete examples?**
A: Check `examples/volttrading-integration/volttrading-provider.js` for a full implementation.
