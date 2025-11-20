# OakView Client-Side Resampling Feature Specification

**Status:** 🚧 TO BE IMPLEMENTED  
**Priority:** HIGH  
**Benefit:** Single data stream, multiple timeframe views

---

## Problem Statement

Currently, if a user wants to view the same symbol at different intervals in a multi-pane layout, the system would need:

- Multiple subscriptions to the data provider
- Separate data streams for each interval
- Complex synchronization between panes
- Higher bandwidth usage

**Example Problem:**
```
Layout: 2 panes
- Pane 1: SPX @ 1-second ticks
- Pane 2: SPX @ 10-second bars

Current (bad):
- Subscribe to 1-second stream → Pane 1
- Subscribe to 10-second stream → Pane 2
- Two separate WebSocket connections
- Data alignment issues
```

---

## Proposed Solution: Client-Side Resampling

**Concept:** Subscribe to the finest (base) interval once, resample client-side for higher intervals.

```
Layout: 2 panes
- Pane 1: SPX @ 1-second ticks
- Pane 2: SPX @ 10-second bars

Proposed (good):
- Subscribe ONCE to 1-second stream (base interval)
- Pane 1: Display ticks directly
- Pane 2: OakView resamples 1s → 10s internally
- Single WebSocket connection
- Perfect alignment (same source)
```

---

## Architecture

### Data Flow

```
Data Provider (WebSocket)
         ↓
  Provides: 1-second ticks
         ↓
    OakView Layout
         ↓
    ┌─────────┴─────────┐
    ↓                   ↓
 Pane 1              Pane 2
 (1s ticks)        (10s bars)
 Direct pass      Resampler
                  aggregates
                  1s → 10s
```

### Component Structure

```typescript
class OakViewLayout {
  private baseSubscription: DataSubscription;
  private resamplers: Map<string, BarResampler>;
  
  subscribeToBaseInterval(symbol, baseInterval) {
    // Single subscription for all panes
    this.baseSubscription = provider.subscribe(symbol, baseInterval, (bar) => {
      // Distribute to all panes
      this.panes.forEach(pane => {
        const targetInterval = pane.getInterval();
        
        if (targetInterval === baseInterval) {
          // Direct pass
          pane.updateRealtime(bar);
        } else {
          // Resample
          const resampler = this.getOrCreateResampler(pane.id, targetInterval);
          const resampledBar = resampler.addBar(bar);
          if (resampledBar) {
            pane.updateRealtime(resampledBar);
          }
        }
      });
    });
  }
}
```

---

## Implementation Plan

### Phase 1: BarResampler Class

Create `src/utils/BarResampler.js`:

```javascript
/**
 * Resamples OHLCV bars from finer to coarser intervals
 * 
 * Example: 1-second bars → 10-second bars
 */
class BarResampler {
  constructor(sourceInterval, targetInterval) {
    this.sourceInterval = sourceInterval;
    this.targetInterval = targetInterval;
    this.targetMs = this.parseIntervalToMs(targetInterval);
    this.currentBar = null;
  }
  
  /**
   * Add a source bar and potentially get a completed target bar
   * @param {Object} sourceBar - OHLCV bar from data provider
   * @returns {Object|null} Completed target bar or null
   */
  addBar(sourceBar) {
    const targetTime = this.getTargetBarTime(sourceBar.time);
    
    // New target bar?
    if (!this.currentBar || this.currentBar.time !== targetTime) {
      const completedBar = this.currentBar;
      
      // Start new bar
      this.currentBar = {
        time: targetTime,
        open: sourceBar.open,
        high: sourceBar.high,
        low: sourceBar.low,
        close: sourceBar.close,
        volume: sourceBar.volume
      };
      
      return completedBar; // Return previous bar (may be null)
    }
    
    // Update current bar
    this.currentBar.high = Math.max(this.currentBar.high, sourceBar.high);
    this.currentBar.low = Math.min(this.currentBar.low, sourceBar.low);
    this.currentBar.close = sourceBar.close;
    this.currentBar.volume += sourceBar.volume;
    
    return null; // Bar not complete yet
  }
  
  /**
   * Calculate target bar time bucket
   */
  getTargetBarTime(sourceTime) {
    const timeMs = typeof sourceTime === 'number' 
      ? sourceTime * 1000 
      : new Date(sourceTime).getTime();
      
    return Math.floor(timeMs / this.targetMs) * this.targetMs / 1000;
  }
  
  /**
   * Parse interval string to milliseconds
   */
  parseIntervalToMs(interval) {
    const match = interval.match(/^(\d+)([SsmHDWMY]?)$/);
    if (!match) throw new Error(`Invalid interval: ${interval}`);
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch(unit) {
      case 'S': return value * 1000;
      case 's': case '': return value * 60 * 1000; // default = minutes
      case 'm': return value * 60 * 1000;
      case 'H': return value * 60 * 60 * 1000;
      case 'D': return value * 24 * 60 * 60 * 1000;
      case 'W': return value * 7 * 24 * 60 * 60 * 1000;
      case 'M': return value * 30 * 24 * 60 * 60 * 1000; // Approximate
      case 'Y': return value * 365 * 24 * 60 * 60 * 1000; // Approximate
      default: throw new Error(`Unknown unit: ${unit}`);
    }
  }
  
  /**
   * Get current incomplete bar (useful for partial bar updates)
   */
  getCurrentBar() {
    return this.currentBar;
  }
  
  /**
   * Force flush current bar (e.g., on unsubscribe)
   */
  flush() {
    const bar = this.currentBar;
    this.currentBar = null;
    return bar;
  }
}

export default BarResampler;
```

### Phase 2: OakViewLayout Integration

Modify `src/oak-view-layout.js`:

```javascript
import BarResampler from './utils/BarResampler.js';

class OakViewLayout {
  constructor() {
    // ... existing code ...
    this._baseSubscription = null;
    this._baseInterval = null;
    this._resamplers = new Map(); // paneId -> BarResampler
  }
  
  /**
   * Smart subscription management:
   * - Subscribes to finest interval once
   * - Resamples for coarser intervals
   */
  _subscribeToSymbol(symbol) {
    // Determine finest interval across all panes
    const intervals = Array.from(this._paneSettings.values())
      .map(s => s.interval)
      .filter(i => i);
      
    if (intervals.length === 0) return;
    
    const baseInterval = this._findFinestInterval(intervals);
    this._baseInterval = baseInterval;
    
    // Unsubscribe from previous
    if (this._baseSubscription) {
      this._baseSubscription();
      this._baseSubscription = null;
    }
    
    // Clear resamplers
    this._resamplers.clear();
    
    // Subscribe once to base interval
    this._baseSubscription = this._dataProvider.subscribe(
      symbol,
      baseInterval,
      (bar) => this._distributeBar(bar)
    );
    
    console.log(`📊 Subscribed to ${symbol} @ ${baseInterval} (base interval)`);
  }
  
  /**
   * Distribute incoming bar to all panes (with resampling)
   */
  _distributeBar(sourceBar) {
    this._paneSettings.forEach((settings, paneId) => {
      const paneIndex = this._getPaneIndex(paneId);
      if (paneIndex === -1) return;
      
      const chart = this.getChartAt(paneIndex);
      if (!chart) return;
      
      const targetInterval = settings.interval;
      
      if (targetInterval === this._baseInterval) {
        // Direct pass - no resampling needed
        chart.updateRealtime(sourceBar);
      } else {
        // Resample to target interval
        const resamplerKey = `${paneId}:${targetInterval}`;
        
        if (!this._resamplers.has(resamplerKey)) {
          this._resamplers.set(
            resamplerKey,
            new BarResampler(this._baseInterval, targetInterval)
          );
        }
        
        const resampler = this._resamplers.get(resamplerKey);
        const resampledBar = resampler.addBar(sourceBar);
        
        if (resampledBar) {
          chart.updateRealtime(resampledBar);
        }
      }
    });
  }
  
  /**
   * Find finest (smallest) interval from list
   */
  _findFinestInterval(intervals) {
    const parseToMs = (interval) => {
      // Use BarResampler's parsing logic
      const resampler = new BarResampler(interval, interval);
      return resampler.parseIntervalToMs(interval);
    };
    
    return intervals.reduce((finest, current) => {
      return parseToMs(current) < parseToMs(finest) ? current : finest;
    });
  }
}
```

### Phase 3: Historical Data Resampling

Modify `src/oak-view-chart.js` to resample historical data:

```javascript
async loadSymbolData(symbol, interval) {
  if (!this._dataProvider) return;
  
  try {
    const baseInterval = this._dataProvider.getBaseInterval(symbol);
    
    // If requesting base interval or no base interval defined
    if (!baseInterval || interval === baseInterval) {
      const data = await this._dataProvider.fetchHistorical(symbol, interval);
      this.setData(data);
      return;
    }
    
    // Check if we need to resample
    const baseMs = this.parseIntervalToMs(baseInterval);
    const targetMs = this.parseIntervalToMs(interval);
    
    if (targetMs > baseMs) {
      // Fetch base interval data
      const baseData = await this._dataProvider.fetchHistorical(symbol, baseInterval);
      
      // Resample to target interval
      const resampledData = this.resampleHistoricalData(baseData, interval);
      this.setData(resampledData);
      
      console.log(`📊 Resampled ${baseData.length} bars (${baseInterval}) → ${resampledData.length} bars (${interval})`);
    } else {
      // Target interval is finer - must request from provider
      const data = await this._dataProvider.fetchHistorical(symbol, interval);
      this.setData(data);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

/**
 * Resample historical OHLCV data to coarser interval
 */
resampleHistoricalData(sourceBars, targetInterval) {
  const resampler = new BarResampler('source', targetInterval);
  const resampledBars = [];
  
  for (const bar of sourceBars) {
    const resampledBar = resampler.addBar(bar);
    if (resampledBar) {
      resampledBars.push(resampledBar);
    }
  }
  
  // Don't forget the last incomplete bar
  const lastBar = resampler.flush();
  if (lastBar) {
    resampledBars.push(lastBar);
  }
  
  return resampledBars;
}
```

---

## Benefits

### 1. **Single Data Stream**
- One WebSocket connection per symbol
- Reduced bandwidth
- Lower server load

### 2. **Perfect Synchronization**
- All panes use same source data
- No timing mismatches
- Charts perfectly aligned

### 3. **Better UX**
- Instant interval switching (no re-subscription delay)
- Smoother multi-pane experience
- Consistent data across views

### 4. **Flexibility**
- Add/remove panes without new subscriptions
- Change intervals without data provider coordination
- Works with any data provider

---

## Example Use Cases

### Use Case 1: Tick Chart + Aggregated View
```
Pane 1: SPX @ 1S (tick data)
Pane 2: SPX @ 10S (10-second bars)
Pane 3: SPX @ 1 (1-minute bars)

→ Single subscription to 1S ticks
→ Pane 1: Direct
→ Pane 2: Resample 1S → 10S
→ Pane 3: Resample 1S → 1m
```

### Use Case 2: Scalping + Position View
```
Pane 1: ES @ 5S (scalping view)
Pane 2: ES @ 1 (entry timing)
Pane 3: ES @ 5 (position view)

→ Single subscription to 5S
→ All resampled from same source
→ Perfect alignment
```

### Use Case 3: Replay System
```
Session replay: 10 ticks/second
Pane 1: Tick chart (raw ticks)
Pane 2: 10-second bars
Pane 3: 1-minute bars

→ Single replay stream
→ Client-side resampling
→ No multiple file reads
```

---

## Implementation Checklist

- [ ] Create `src/utils/BarResampler.js`
- [ ] Add unit tests for BarResampler
- [ ] Integrate into OakViewLayout
- [ ] Add historical data resampling to OakViewChart
- [ ] Update data provider interface docs
- [ ] Add resampling indicator to UI (show "resampled from 1S")
- [ ] Test with websocket example
- [ ] Test with multi-pane layout
- [ ] Performance testing (1000+ bars/sec)
- [ ] Documentation update

---

## Edge Cases to Handle

### 1. **Incomplete Bars**
```javascript
// Last bar may be incomplete
// Should update it, not create new bar
resampler.addBar({time: 100, ...}); // Bar 1 starts
resampler.addBar({time: 105, ...}); // Still bar 1
// User switches away - flush incomplete bar
const lastBar = resampler.flush();
```

### 2. **Time Alignment**
```javascript
// Ensure bars align to proper boundaries
// 10:30:05 tick → 10:30:00 (10-second bar)
// 10:30:15 tick → 10:30:10 (10-second bar)
```

### 3. **Volume Aggregation**
```javascript
// Sum volumes correctly
currentBar.volume += sourceBar.volume; // ✅
currentBar.volume = sourceBar.volume;  // ❌
```

### 4. **First Bar**
```javascript
// First addBar() returns null (no previous bar)
const bar1 = resampler.addBar(tick1); // null
const bar2 = resampler.addBar(tick2); // may return bar1
```

---

## Performance Considerations

### Memory
- One BarResampler per (pane, interval) pair
- Minimal: ~100 bytes per resampler
- For 4 panes with different intervals: ~400 bytes

### CPU
- Simple arithmetic operations per tick
- O(1) per tick
- Negligible overhead

### Latency
- Direct pass: 0ms added latency
- Resampling: < 1ms added latency
- No network round-trip

---

## Migration Path

### Phase 1: Optional Feature
```javascript
// Data provider can opt-in
class MyProvider extends OakViewDataProvider {
  supportsClientResampling() {
    return true; // Enable feature
  }
  
  getBaseInterval(symbol) {
    return '1S'; // Provide finest interval
  }
}
```

### Phase 2: Default Behavior
- Make resampling default for all providers
- Fallback to provider-side if client resampling fails

### Phase 3: Always On
- All data providers must declare base interval
- OakView always resamples client-side

---

## Testing Strategy

### Unit Tests
```javascript
describe('BarResampler', () => {
  it('should aggregate 1S → 10S correctly', () => {
    const resampler = new BarResampler('1S', '10S');
    
    // 10 one-second bars
    for (let i = 0; i < 10; i++) {
      const bar = resampler.addBar({
        time: i,
        open: 100 + i,
        high: 100 + i + 1,
        low: 100 + i - 1,
        close: 100 + i + 0.5,
        volume: 1000
      });
      
      if (i < 9) {
        expect(bar).toBeNull(); // Not complete yet
      } else {
        expect(bar).toMatchObject({
          time: 0,
          open: 100,
          high: 110,
          low: 99,
          close: 109.5,
          volume: 10000
        });
      }
    }
  });
});
```

### Integration Tests
```javascript
describe('OakViewLayout Resampling', () => {
  it('should subscribe once and resample for all panes', async () => {
    const layout = document.createElement('oak-view-layout');
    layout.setAttribute('layout', 'dual');
    
    // Pane 1: 1S, Pane 2: 10S
    // Should subscribe once to 1S
    
    const subscribeSpy = jest.spyOn(provider, 'subscribe');
    
    await layout.loadSymbol('SPX', ['1S', '10S']);
    
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(subscribeSpy).toHaveBeenCalledWith('SPX', '1S', expect.any(Function));
  });
});
```

---

**Status:** Ready for implementation  
**Next Step:** Create BarResampler class and add unit tests

