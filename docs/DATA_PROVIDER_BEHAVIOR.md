# OakView Internal Behavior & Call Sequence

Complete documentation of when and how OakView calls your data provider methods.

## Table of Contents

- [Lifecycle Overview](#lifecycle-overview)
- [Method Call Sequence](#method-call-sequence)
- [Caching Behavior](#caching-behavior)
- [Trigger Events](#trigger-events)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

---

## Lifecycle Overview

```
User Action              OakView Calls           Your Provider
────────────────────────────────────────────────────────────────
1. Set provider       →  initialize(config)   →  Connect to API
                         ↓
2. Initial load       →  fetchHistorical()   →  Load history
                         ↓
3. Subscribe          →  subscribe()          →  Start WebSocket
                         ↓
4. Real-time data     ←  callback(bar)        ←  Send updates
                         ↓
5. Change symbol      →  unsubscribe()        →  Cleanup old
                      →  fetchHistorical()    →  Load new history
                      →  subscribe()          →  Subscribe new
                         ↓
6. Component destroy  →  disconnect()         →  Cleanup all
```

---

## Method Call Sequence

### 1. Component Initialization

**When**: User creates `<oak-view>` element

```javascript
// OakView internal sequence:
1. Component mounts
2. Waits for setDataProvider() to be called
```

**No provider methods called yet**

---

### 2. Setting the Provider

**When**: `chart.setDataProvider(provider)` is called

```javascript
// OakView calls:
await provider.initialize(config);

// Notes:
// - Called ONCE per provider instance
// - Must complete before any other methods are called
// - Should throw Error if connection fails
// - Config is passed from setDataProvider(provider, config)
```

**What to do in initialize()**:
- Authenticate with your API
- Establish WebSocket connections
- Load configuration/metadata
- **Do NOT** load data yet (wait for fetchHistorical)

---

### 3. Initial Data Load

**When**: Component renders with a symbol

```javascript
// OakView calls:
const data = await provider.fetchHistorical(symbol, interval, from, to);

// Example call:
provider.fetchHistorical('AAPL', '1D', undefined, undefined);

// Notes:
// - from/to are usually undefined on initial load
// - OakView does NOT specify how much data to return
// - You decide the default range (e.g., "last year")
// - Return as much data as makes sense for your use case
```

**Common default ranges by interval**:
- Seconds (1S-45S): Last 24 hours
- Minutes (1-45): Last 1-7 days
- Hours (60-240): Last 1-3 months
- Daily (1D): Last 1-2 years
- Weekly (1W): Last 5-10 years

---

### 4. Real-Time Subscription (If Implemented)

**When**: After fetchHistorical() completes successfully

```javascript
// OakView calls (if subscribe method exists):
const unsubscribe = provider.subscribe(symbol, interval, (bar) => {
  // OakView will update the chart with this bar
});

// Notes:
// - Only called if subscribe() is implemented
// - Called immediately after historical data loads
// - Callback will be called multiple times (whenever you have updates)
// - OakView stores the unsubscribe function for cleanup
```

**When to call the callback**:
- When a new bar starts (new time period)
- When the current bar updates (price changes within same period)
- As frequently as your data source updates (ticks, quotes, etc.)

**CRITICAL**: Callback bars must have time >= last historical bar time

---

### 5. Symbol Search (If Implemented)

**When**: User types in the symbol search box

```javascript
// OakView calls:
const results = await provider.searchSymbols(query);

// Example calls:
provider.searchSymbols('');      // Dropdown opened
provider.searchSymbols('AA');    // User typed "AA"
provider.searchSymbols('AAPL');  // User typed "AAPL"

// Debouncing:
// - OakView waits 300ms after user stops typing
// - Multiple rapid keystrokes = one call
// - Empty string = user opened dropdown (show popular/all)
```

**Return format**:
```javascript
[
  {
    symbol: 'AAPL',          // Displayed in bold
    name: 'Apple Inc.',      // Displayed below symbol
    exchange: 'NASDAQ',      // Displayed as badge
    type: 'stock'            // Used for future filtering
  }
]
```

**Limits**:
- OakView displays first 50 results
- No pagination (keep results concise)
- Results shown in a dropdown list

---

### 6. Interval Availability Check (If Implemented)

**When**: User changes symbol OR component initializes

```javascript
// OakView calls:
const intervals = provider.getAvailableIntervals(symbol);

// Returns:
// - Array of strings: ['1m', '5m', '1D'] (only these shown in dropdown)
// - null: All standard intervals shown
// - undefined: Same as null (all intervals)

// Standard intervals OakView shows (if null returned):
// ['1', '5', '15', '30', '60', '120', '180', '240', '1D', '1W', '1M']
```

**Use this to**:
- Hide intervals you don't have data for
- Show only intervals supported by your API
- Customize available timeframes per symbol

---

### 7. Base Interval Check (If Implemented)

**When**: User changes symbol

```javascript
// OakView calls:
const baseInterval = provider.getBaseInterval(symbol);

// Currently used for:
// - Informational purposes
// - Future: May show "resampled" indicator if user requests different interval
```

---

### 8. Data Availability Check (If Implemented)

**When**: Building interval dropdown

```javascript
// OakView calls for each interval:
const hasData = provider.hasData(symbol, '1m');
const hasData = provider.hasData(symbol, '5m');
// ... etc for each interval

// Returns:
// - true: Interval is enabled in dropdown
// - false: Interval is disabled (greyed out)
```

**Performance**: Called multiple times (once per interval), so make it fast!

---

### 9. Symbol Change

**When**: User selects a different symbol

```javascript
// OakView calls in sequence:
1. unsubscribe()           // Cleanup old subscription (if subscribe was called)
2. fetchHistorical(newSymbol, currentInterval)
3. subscribe(newSymbol, currentInterval, callback)  // If implemented
```

---

### 10. Interval Change

**When**: User selects a different timeframe

```javascript
// OakView calls in sequence:
1. unsubscribe()           // Cleanup old subscription
2. fetchHistorical(currentSymbol, newInterval)
3. subscribe(currentSymbol, newInterval, callback)
```

**Note**: Symbol stays the same, only interval changes

---

### 11. Panning/Scrolling Left

**When**: User scrolls chart to see older data

```javascript
// OakView calls:
const moreData = await provider.fetchHistorical(
  symbol,
  interval,
  earlierFrom,    // Earlier timestamp
  currentOldest   // Current oldest bar time
);

// OakView behavior:
// - Detects when user scrolls near left edge
// - Requests older data
// - Appends new data to existing chart
// - Only if there's more data to load
```

**When NOT called**:
- Scrolling right (no future data requested)
- Scrolling in middle of chart

---

### 12. Component Destruction

**When**: `<oak-view>` element removed from DOM

```javascript
// OakView calls:
1. unsubscribe()    // Cleanup subscriptions
2. disconnect()     // Final cleanup (if implemented)
```

**Clean up**:
- Close WebSocket connections
- Cancel pending HTTP requests
- Clear caches
- Remove event listeners

---

## Caching Behavior

### OakView Does NOT Cache

❌ **OakView does NOT cache your data**

This means:
- Changing symbol and back = two fetchHistorical() calls
- Changing interval and back = two fetchHistorical() calls
- Reloading page = all data fetched again

### You Should Implement Caching

✅ **Implement caching in your provider**

```javascript
class MyProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.cache = new Map();
  }

  async fetchHistorical(symbol, interval, from, to) {
    const key = `${symbol}_${interval}`;
    
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Load from API
    const data = await this.loadFromAPI(symbol, interval);
    
    // Cache it
    this.cache.set(key, data);
    
    return data;
  }
}
```

**Cache invalidation**:
- Clear cache on disconnect()
- TTL (time-to-live) for real-time data
- Clear specific symbol when updated

---

## Trigger Events

### What Triggers fetchHistorical()?

1. **Initial load** - Component renders with symbol
2. **Symbol change** - User selects different symbol
3. **Interval change** - User selects different timeframe
4. **Pan left** - User scrolls to see older data
5. **Explicit reload** - (If exposed in UI)

### What Triggers subscribe()?

1. **After fetchHistorical() completes** - If method exists
2. **Symbol change** - New subscription after data loads
3. **Interval change** - New subscription after data loads

### What Triggers searchSymbols()?

1. **Dropdown opened** - Called with empty string ''
2. **User types** - Debounced 300ms after last keystroke
3. **Minimum length** - (Future feature, currently no minimum)

### What Triggers getAvailableIntervals()?

1. **Symbol change** - To update interval dropdown
2. **Initial load** - To populate interval dropdown

---

## Error Handling

### How OakView Handles Errors

```javascript
// If initialize() throws:
try {
  await provider.initialize(config);
} catch (error) {
  console.error('Provider initialization failed:', error);
  // Chart shows error message
  // No other methods are called
}

// If fetchHistorical() throws:
try {
  const data = await provider.fetchHistorical(symbol, interval);
} catch (error) {
  console.error('Failed to load data:', error);
  // Chart shows "No data" message
  // subscribe() is NOT called
}

// If subscribe() throws:
try {
  const unsubscribe = provider.subscribe(symbol, interval, callback);
} catch (error) {
  console.error('Subscription failed:', error);
  // Historical data still shown
  // Real-time updates disabled
}

// If searchSymbols() throws:
try {
  const results = await provider.searchSymbols(query);
} catch (error) {
  console.error('Search failed:', error);
  // Empty results shown
  // User can still type symbol directly
}
```

### Error Messages You Should Throw

**Be specific**:
```javascript
// ❌ Bad
throw new Error('Failed to load');

// ✅ Good
throw new Error('Symbol AAPL not found');
throw new Error('API rate limit exceeded (try again in 60s)');
throw new Error('Invalid interval format: 100ms');
```

---

## Performance Considerations

### fetchHistorical() Optimization

**Problem**: Called frequently (symbol changes, interval changes, panning)

**Solutions**:
1. **Implement caching** - Store results in memory
2. **Limit data** - Don't return more bars than needed
3. **Use AbortController** - Cancel old requests

```javascript
class MyProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.cache = new Map();
    this.currentRequest = null;
  }

  async fetchHistorical(symbol, interval, from, to) {
    // Cancel previous request
    if (this.currentRequest) {
      this.currentRequest.abort();
    }

    // Check cache
    const key = `${symbol}_${interval}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Make new request
    const controller = new AbortController();
    this.currentRequest = controller;

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });
      const data = await response.json();
      
      this.cache.set(key, data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return [];
      }
      throw error;
    }
  }
}
```

### subscribe() Optimization

**Problem**: Called for every symbol/interval change

**Solutions**:
1. **Reuse WebSocket** - Don't create new connection each time
2. **Reference counting** - Track active subscriptions
3. **Batch subscribe** - Send multiple symbols at once

```javascript
class MyProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.ws = null;
    this.subscriptions = new Map(); // symbol -> refCount
  }

  async initialize(config) {
    // Create ONE WebSocket connection
    this.ws = new WebSocket(config.wsUrl);
    await new Promise(resolve => this.ws.onopen = resolve);
  }

  subscribe(symbol, interval, callback) {
    // Increment reference count
    const count = (this.subscriptions.get(symbol) || 0) + 1;
    this.subscriptions.set(symbol, count);

    // Subscribe only if first time
    if (count === 1) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        symbol: symbol
      }));
    }

    // Setup listener
    const listener = (event) => {
      const data = JSON.parse(event.data);
      if (data.symbol === symbol) {
        callback(this.aggregateBar(data, interval));
      }
    };

    this.ws.addEventListener('message', listener);

    // Return unsubscribe
    return () => {
      this.ws.removeEventListener('message', listener);
      
      // Decrement reference count
      const newCount = this.subscriptions.get(symbol) - 1;
      if (newCount <= 0) {
        // Last subscriber, unsubscribe from server
        this.ws.send(JSON.stringify({
          action: 'unsubscribe',
          symbol: symbol
        }));
        this.subscriptions.delete(symbol);
      } else {
        this.subscriptions.set(symbol, newCount);
      }
    };
  }
}
```

### searchSymbols() Optimization

**Already optimized by OakView**:
- Debounced 300ms
- Cancelled if user continues typing

**Your optimizations**:
1. **Limit results** - Return max 50 items
2. **Cache popular searches**
3. **Client-side filtering** (if you have symbol list)

---

## Summary

### Key Takeaways

1. **initialize()** - Called once, setup connections
2. **fetchHistorical()** - Called frequently, implement caching
3. **subscribe()** - Called after data loads, reuse connections
4. **searchSymbols()** - Called on user input, already debounced
5. **getAvailableIntervals()** - Called on symbol change
6. **OakView does NOT cache** - You should implement caching
7. **Errors are caught** - Throw descriptive error messages

### Call Frequency (Typical Session)

```
Method                  Times Called        When
───────────────────────────────────────────────────────────
initialize()            1                   On setDataProvider()
fetchHistorical()       5-10                Each symbol/interval change
subscribe()             5-10                After each fetchHistorical()
searchSymbols()         10-20               As user types
getAvailableIntervals() 5-10                Each symbol change
hasData()               50-100              Each interval dropdown build
disconnect()            1                   On component destroy
```

### Testing Your Understanding

Use the [Provider Validator](./validator.js) to test your implementation:

```javascript
import { validateProvider } from 'oakview/dist/provider-validator.js';

const provider = new MyProvider();
await validateProvider(provider, { debug: true });
```

This will show you exactly how OakView will call your methods.
