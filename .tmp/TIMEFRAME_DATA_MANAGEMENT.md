# OakView Timeframe/Interval Data Management

**Question:** How does OakView manage data coming in different timeframes (e.g., 100ms ticks, 1-second data, daily data)?

---

## Current Implementation

### ❌ OakView Does NOT Handle Timeframe Conversion

**OakView does NOT:**
- Aggregate ticks into bars
- Resample data between intervals
- Convert 100ms data to 1-minute bars
- Up-sample daily data to intraday

**OakView DOES:**
- Display whatever OHLCV data the data provider returns
- Request data at the user-selected interval
- Show/hide interval buttons based on data availability

---

## Architecture Overview

### Data Flow

```
User selects interval (e.g., "5m")
         ↓
OakView calls provider.fetchHistorical(symbol, "5m")
         ↓
Data Provider MUST return 5-minute bars
         ↓
OakView displays the bars (no transformation)
```

**Key Point:** The data provider is responsible for ALL timeframe handling.

---

## Data Provider Responsibility

The data provider must handle:

### 1. **Native Interval Declaration**
```javascript
getBaseInterval(symbol) {
  return '1';  // "I provide 1-second tick data"
  // OR
  return '1D'; // "I provide daily bars"
  // OR
  return '1m'; // "I provide 1-minute bars"
}
```

### 2. **Available Intervals Declaration**
```javascript
getAvailableIntervals(symbol) {
  // Option A: Only specific intervals (e.g., CSV with limited files)
  return ['1', '5', '15', '30', '60', '1D'];
  
  // Option B: All standard intervals (provider handles resampling)
  return null; // OakView shows all standard intervals
}
```

### 3. **Fetching Data at Requested Interval**
```javascript
async fetchHistorical(symbol, interval) {
  // Provider MUST return bars at the requested interval
  
  // If you have native data at this interval:
  if (this.hasNativeData(symbol, interval)) {
    return this.loadNativeData(symbol, interval);
  }
  
  // If you need to resample:
  const nativeInterval = this.getBaseInterval(symbol);
  const nativeData = await this.loadNativeData(symbol, nativeInterval);
  return this.resampleBars(nativeData, interval);
}
```

### 4. **Real-time Data Aggregation** (if using subscribe())
```javascript
subscribe(symbol, interval, callback) {
  // If you receive ticks at 100ms intervals
  // but user wants 5-minute bars:
  
  const barBuilder = new BarAggregator(interval);
  
  this.tickStream.on('tick', (tick) => {
    const completedBar = barBuilder.addTick(tick);
    if (completedBar) {
      callback(completedBar); // Only send completed bars
    }
  });
  
  return () => this.tickStream.close();
}
```

---

## Example Scenarios

### Scenario 1: Tick Data to Minute Bars

**You have:** 100ms tick data  
**User requests:** 1-minute bars

**Your data provider must:**
```javascript
class TickDataProvider extends OakViewDataProvider {
  getBaseInterval(symbol) {
    return '100ms'; // ❌ PROBLEM: OakView doesn't support sub-minute
    // Better: return '1'; // Aggregate to 1-second in your provider
  }
  
  async fetchHistorical(symbol, interval) {
    // Load all ticks
    const ticks = await this.loadTicks(symbol);
    
    // Aggregate to requested interval
    return this.aggregateTicks(ticks, interval);
  }
  
  aggregateTicks(ticks, interval) {
    const bars = [];
    const intervalMs = this.parseIntervalToMs(interval);
    
    let currentBar = null;
    for (const tick of ticks) {
      const barTime = Math.floor(tick.time / intervalMs) * intervalMs;
      
      if (!currentBar || currentBar.time !== barTime) {
        if (currentBar) bars.push(currentBar);
        currentBar = {
          time: barTime,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume
        };
      } else {
        currentBar.high = Math.max(currentBar.high, tick.price);
        currentBar.low = Math.min(currentBar.low, tick.price);
        currentBar.close = tick.price;
        currentBar.volume += tick.volume;
      }
    }
    
    if (currentBar) bars.push(currentBar);
    return bars;
  }
}
```

### Scenario 2: Daily Data Only

**You have:** Daily bars  
**User requests:** 1-minute bars

**Options:**

**Option A: Don't allow it**
```javascript
getAvailableIntervals(symbol) {
  return ['1D', '1W', '1M']; // Only daily+
}

hasData(symbol, interval) {
  const allowed = ['1D', '1W', '1M'];
  return allowed.includes(interval);
}
```
OakView will disable/hide minute interval buttons.

**Option B: Up-sample (not recommended - misleading)**
```javascript
async fetchHistorical(symbol, interval) {
  const dailyBars = await this.loadDaily(symbol);
  
  if (interval === '1D') {
    return dailyBars;
  }
  
  // ❌ Don't do this - creates fake intraday data
  return this.fakeIntradayFromDaily(dailyBars, interval);
}
```

### Scenario 3: CSV Files at Specific Intervals

**You have:** CSV files: `SPX_1D.csv`, `SPX_60.csv`, `SPX_5.csv`  
**User requests:** Any interval

**Solution:**
```javascript
class CSVDataProvider extends OakViewDataProvider {
  constructor() {
    super();
    this.files = new Map([
      ['SPX', ['1D', '60', '5']], // Available intervals per symbol
      ['QQQ', ['1D', '15']]
    ]);
  }
  
  getBaseInterval(symbol) {
    const intervals = this.files.get(symbol) || [];
    return intervals[0] || '1D'; // Return finest granularity
  }
  
  getAvailableIntervals(symbol) {
    // IMPORTANT: Also include intervals you can resample UP to
    const available = this.files.get(symbol) || [];
    const base = available[0]; // Finest interval
    
    // Can always go from fine → coarse
    const all = ['1', '5', '15', '30', '60', '1D', '1W', '1M'];
    const baseIndex = all.indexOf(base);
    
    return all.slice(baseIndex); // All intervals >= base
  }
  
  hasData(symbol, interval) {
    const available = this.getAvailableIntervals(symbol);
    return available.includes(interval);
  }
  
  async fetchHistorical(symbol, interval) {
    const nativeIntervals = this.files.get(symbol);
    
    // If we have native data at this interval
    if (nativeIntervals.includes(interval)) {
      return this.loadCSV(`${symbol}_${interval}.csv`);
    }
    
    // Otherwise, resample from finer interval
    const finerInterval = this.findFinerInterval(nativeIntervals, interval);
    const data = await this.loadCSV(`${symbol}_${finerInterval}.csv`);
    return this.resampleBars(data, interval);
  }
  
  resampleBars(sourceBars, targetInterval) {
    // Aggregate source bars into larger bars
    // ... implementation ...
  }
}
```

---

## Supported Interval Formats

OakView recognizes these interval formats:

**Minutes:** `1`, `5`, `15`, `30`, `60` (numbers only = minutes)  
**Hours:** `1H`, `2H`, `4H`, `12H`  
**Days:** `1D`, `2D`  
**Weeks:** `1W`  
**Months:** `1M`, `3M`, `6M`  
**Years:** `1Y`

**NOT Supported:**
- ❌ Seconds: `1S`, `5S` (UI shows them but most providers don't support)
- ❌ Milliseconds: `100ms`
- ❌ Ticks: `1T`, `100T` (UI shows them but most providers don't support)

**Pattern:** `^(\d+)([mHDWMY]?)$`

**Recommendation:** If your data is sub-minute, aggregate it to at least 1-minute intervals before returning to OakView.

---

## Real-Time Data (subscribe())

For real-time tick data with `subscribe()`:

### The Problem
```
You receive:  tick @ 09:30:00.100
              tick @ 09:30:00.200
              tick @ 09:30:00.300
              ...

User wants:   1-minute bars
```

### The Solution

**Aggregate in your provider BEFORE calling the callback:**

```javascript
subscribe(symbol, interval, callback) {
  const barBuilder = new BarAggregator(interval);
  
  this.websocket.on('tick', (tick) => {
    const maybeBar = barBuilder.addTick(tick);
    
    // Only call callback when bar is COMPLETE
    if (maybeBar && maybeBar.isComplete) {
      callback({
        time: maybeBar.time,
        open: maybeBar.open,
        high: maybeBar.high,
        low: maybeBar.low,
        close: maybeBar.close,
        volume: maybeBar.volume
      });
    }
  });
  
  return () => this.websocket.close();
}

class BarAggregator {
  constructor(interval) {
    this.interval = interval;
    this.intervalMs = this.parseIntervalToMs(interval);
    this.currentBar = null;
  }
  
  addTick(tick) {
    const barTime = Math.floor(tick.time / this.intervalMs) * this.intervalMs;
    
    if (!this.currentBar || this.currentBar.time !== barTime) {
      const completedBar = this.currentBar;
      
      this.currentBar = {
        time: barTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
        isComplete: false
      };
      
      if (completedBar) {
        completedBar.isComplete = true;
        return completedBar;
      }
    } else {
      this.currentBar.high = Math.max(this.currentBar.high, tick.price);
      this.currentBar.low = Math.min(this.currentBar.low, tick.price);
      this.currentBar.close = tick.price;
      this.currentBar.volume += tick.volume;
    }
    
    return null; // Bar not complete yet
  }
}
```

---

## UI Behavior

### Interval Button Filtering

OakView will automatically:

1. **Call `getAvailableIntervals(symbol)`**
2. **Show/hide buttons** based on return value
3. **Disable intervals** where `hasData(symbol, interval)` returns false

**Example:**
```javascript
// Provider says only these intervals available:
getAvailableIntervals('SPX') → ['5', '15', '60', '1D']

// OakView will:
// - Show: 5m, 15m, 60m(1H), 1D, 1W, 1M buttons
// - Hide: 1m, 2m, 3m, 4m, 10m, 30m buttons
```

### Auto-Update to Base Interval

When user selects a symbol, OakView will:

1. Call `getBaseInterval(symbol)`
2. Auto-update interval button to show that value
3. Fetch data at base interval

**Example:**
```javascript
User clicks "QQQ" in symbol search
↓
getBaseInterval('QQQ') → '1'
↓
Interval button updates to "1"
↓
fetchHistorical('QQQ', '1') called
```

---

## Summary

**OakView's Philosophy:**
- **Presentation layer** - Displays data, doesn't transform it
- **Data provider's job** - All timeframe conversions/aggregations

**Your Responsibilities:**
1. ✅ Declare native interval via `getBaseInterval()`
2. ✅ Declare available intervals via `getAvailableIntervals()`
3. ✅ Implement resampling in `fetchHistorical()` if needed
4. ✅ Aggregate ticks in `subscribe()` if needed
5. ✅ Return bars at the REQUESTED interval (not your native interval)

**OakView Will:**
1. ✅ Show/hide interval buttons based on your declarations
2. ✅ Call `fetchHistorical()` with user-selected interval
3. ✅ Display the bars you return (no transformation)
4. ✅ Auto-update to base interval when symbol changes

**Key Takeaway:** If you have 100ms tick data and user wants 5-minute bars, YOU must aggregate those ticks into 5-minute OHLCV bars before returning them to OakView.

