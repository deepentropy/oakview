# Quick Start: Stock Replay Integration with OakView

**For:** Momentum Stock Replay Team  
**Use Case:** Streaming historical session data as real-time replay

---

## Step-by-Step Implementation

### 1. Implement Data Provider

Your `ReplaySessionDataProvider` should implement:

```javascript
import { OakViewDataProvider } from 'oakview';

class ReplaySessionDataProvider extends OakViewDataProvider {
  async initialize(config) {
    // Load session list, etc.
  }

  async searchSymbols(query) {
    // Return array of session objects
    return this.sessions.map(session => ({
      symbol: session.id,           // e.g., "OLMA-20251118"
      description: session.name,    // e.g., "OLMA Session"
      exchange: "REPLAY",
      type: "session"
    }));
  }

  async fetchHistorical(sessionId, interval) {
    // Load ALL bars for the session
    // Return array of OHLCV objects
    const bars = await this.loadSessionBars(sessionId);
    return bars;
  }

  getBaseInterval(sessionId) {
    // Return the native interval of your tick data
    return '1';  // 1 second (OakView minimum is 1 minute, but we'll resample)
  }

  getAvailableIntervals(sessionId) {
    // Return intervals you support
    return ['1', '5', '15', '30', '60'];  // Minutes
  }

  subscribe(sessionId, interval, callback) {
    // Start streaming ticks from session
    const subscription = this.replayEngine.subscribe(sessionId, (tick) => {
      // Convert tick to OHLCV bar
      const bar = this.convertTickToBar(tick);
      callback(bar);
    });

    // Return cleanup function
    return () => subscription.unsubscribe();
  }
}
```

---

### 2. Initialize Chart

```javascript
// Create provider
const provider = new ReplaySessionDataProvider();
await provider.initialize();

// Create chart (in ChartContainer.jsx)
const chartElement = document.createElement('oak-view-chart');
chartElement.setAttribute('theme', 'dark');
chartElement.setAttribute('symbol', 'OLMA-20251118');
chartElement.setAttribute('interval', '1');

// Set provider
chartElement.setDataProvider(provider);

// Add to DOM
container.appendChild(chartElement);
```

---

### 3. Load Historical Data (KEY STEP!)

```javascript
async function loadSession(sessionId) {
  try {
    // 1. Fetch ALL session bars
    const historicalBars = await provider.fetchHistorical(sessionId, '1');
    
    // 2. Set them through OakView API
    // THIS IS CRITICAL - stores data internally for chart type changes
    chartElement.setData(historicalBars);
    
    console.log(`✓ Loaded ${historicalBars.length} bars for ${sessionId}`);
    
  } catch (error) {
    console.error('Failed to load session:', error);
  }
}

// Load initial session
await loadSession('OLMA-20251118');
```

---

### 4. Subscribe to Replay Stream

```javascript
let currentSubscription = null;

async function startReplay(sessionId, speed = 1.0) {
  // Clean up previous subscription
  if (currentSubscription) {
    currentSubscription();
    currentSubscription = null;
  }

  // Load historical data FIRST
  const historicalBars = await provider.fetchHistorical(sessionId, '1');
  chartElement.setData(historicalBars);

  // Subscribe to replay ticks
  currentSubscription = provider.subscribe(sessionId, '1', (bar) => {
    // Update chart with each tick
    chartElement.updateRealtime(bar);
    
    // Optional: Update UI stats
    updateReplayStats(bar);
  });

  console.log(`✓ Started replay for ${sessionId} at ${speed}x speed`);
}

// Start replay
await startReplay('OLMA-20251118', 1.0);
```

---

### 5. Handle Symbol Changes

```javascript
// Listen for symbol changes from search modal
chartElement.addEventListener('symbol-change', async (e) => {
  const newSessionId = e.detail.symbol;
  
  console.log(`Symbol changed to: ${newSessionId}`);
  
  // Stop current replay
  if (currentSubscription) {
    currentSubscription();
    currentSubscription = null;
  }
  
  // Load new session
  await startReplay(newSessionId, currentSpeed);
});
```

---

### 6. Handle Speed Changes

```javascript
function setReplaySpeed(speed) {
  // Your replay engine should support speed changes
  provider.replayEngine.setSpeed(speed);
  currentSpeed = speed;
  
  console.log(`Replay speed: ${speed}x`);
}

// Speed controls
document.getElementById('speed-0.5x').onclick = () => setReplaySpeed(0.5);
document.getElementById('speed-1x').onclick = () => setReplaySpeed(1.0);
document.getElementById('speed-2x').onclick = () => setReplaySpeed(2.0);
document.getElementById('speed-10x').onclick = () => setReplaySpeed(10.0);
```

---

## Complete Example

```javascript
// ChartContainer.jsx (simplified)
import React, { useEffect, useRef } from 'react';
import ReplaySessionDataProvider from './ReplaySessionDataProvider';

function ChartContainer() {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const subscriptionRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    async function initChart() {
      // Create provider
      providerRef.current = new ReplaySessionDataProvider();
      await providerRef.current.initialize();

      // Create chart
      const chart = document.createElement('oak-view-chart');
      chart.setAttribute('theme', 'dark');
      chart.setAttribute('symbol', 'OLMA-20251118');
      chart.setAttribute('interval', '1');
      
      // Set provider
      chart.setDataProvider(providerRef.current);
      
      // Add to DOM
      containerRef.current.appendChild(chart);
      chartRef.current = chart;

      // Load initial session
      await loadSession('OLMA-20251118');
    }

    async function loadSession(sessionId) {
      const provider = providerRef.current;
      const chart = chartRef.current;

      // Clean up previous subscription
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }

      try {
        // 1. Fetch historical bars
        const bars = await provider.fetchHistorical(sessionId, '1');
        
        // 2. Set data (KEY STEP!)
        chart.setData(bars);
        
        // 3. Subscribe to replay
        subscriptionRef.current = provider.subscribe(sessionId, '1', (bar) => {
          chart.updateRealtime(bar);
        });

        console.log(`✓ Session ${sessionId} loaded`);
        
      } catch (error) {
        console.error('Failed to load session:', error);
      }
    }

    initChart();

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}

export default ChartContainer;
```

---

## Chart Type Toolbar Test

After implementing the above pattern, test that the toolbar works:

1. Load a session
2. Start replay
3. Click chart type buttons (Candles → Line → Area → Bar)
4. Chart should switch types smoothly ✅
5. Replay continues updating the new series ✅

**Expected:** All chart types work while replay is running

**If it doesn't work:** You're not calling `setData()` - the historical data MUST be stored via `setData()` for chart type changes to work.

---

## Common Issues

### Issue: Chart type change makes chart blank
**Cause:** You didn't call `setData()` with historical bars  
**Fix:** Always call `chartElement.setData(historicalBars)` before subscribing

### Issue: Interval shows "D" instead of "1"
**Cause:** Old OakView version  
**Fix:** Update to latest version (includes interval auto-update fix)

### Issue: Updates are slow
**Cause:** Calling `setData()` for each tick  
**Fix:** Use `updateRealtime()` for incremental updates, not `setData()`

### Issue: Memory leak during long replays
**Cause:** Not unsubscribing when component unmounts  
**Fix:** Always call the unsubscribe function in cleanup

---

## Performance Tips

### 1. Limit Historical Bars
```javascript
// Don't load ALL bars if session is very long
const bars = await provider.fetchHistorical(sessionId, '1');
const recentBars = bars.slice(-1000);  // Last 1000 bars only
chartElement.setData(recentBars);
```

### 2. Throttle Updates
```javascript
// For very fast tick data, throttle updates
let lastUpdate = 0;
const updateInterval = 100; // ms

provider.subscribe(sessionId, '1', (bar) => {
  const now = Date.now();
  if (now - lastUpdate > updateInterval) {
    chartElement.updateRealtime(bar);
    lastUpdate = now;
  }
});
```

### 3. Use RequestAnimationFrame
```javascript
let pendingBar = null;

provider.subscribe(sessionId, '1', (bar) => {
  pendingBar = bar;
});

function updateChart() {
  if (pendingBar) {
    chartElement.updateRealtime(pendingBar);
    pendingBar = null;
  }
  requestAnimationFrame(updateChart);
}

requestAnimationFrame(updateChart);
```

---

## Summary

✅ **Always call `setData()` first** with historical bars  
✅ **Use `updateRealtime()`** for each new tick  
✅ **Unsubscribe** in cleanup  
✅ **Chart type toolbar** will work perfectly  

**Key takeaway:** The pattern `setData()` → `subscribe()` → `updateRealtime()` is the correct way to integrate real-time/replay data with OakView!

