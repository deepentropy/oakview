# Response to Momentum Stock Replay Team

**Date:** 2025-11-20  
**From:** OakView Development Team  
**Re:** Issues Report for OakView Integration

---

## Thank You! 🙏

First, thank you for this excellent, detailed report! Your technical analysis is spot-on, and you've helped us identify both bugs and documentation gaps. We really appreciate the collaborative approach.

---

## TL;DR - Quick Solution ✅

**Good news:** You can implement your use case WITHOUT bypassing OakView's API! 

Here's the **correct pattern** that will make everything work:

```javascript
// 1. Fetch historical data
const historicalBars = await provider.fetchHistorical(symbol, interval);

// 2. Set it on the chart (this populates internal _data)
chartElement.setData(historicalBars);

// 3. Subscribe to real-time updates
const unsubscribe = provider.subscribe(symbol, interval, (bar) => {
  chartElement.updateRealtime(bar);  // ← Use OakView's method
});
```

**Why this works:**
- `setData()` stores data in `this._data` internally
- Chart type toolbar uses `this._data` to rebuild series
- `updateRealtime()` updates the current series efficiently
- ✅ Chart type changes work perfectly!

---

## Detailed Answers

### 🔴 Issue #1: Chart Type Toolbar (CRITICAL)

**Status:** ✅ **YOUR USE CASE IS SUPPORTED** - You just need to use the right pattern

**What Went Wrong:**

You bypassed OakView's API by creating series manually:

```javascript
// ❌ This bypasses OakView
paneChart._playbackSeries = lwChart.addSeries(CandlestickSeries, {...});
paneChart._playbackSeries.update(barData);
```

**Why it failed:**
- Chart type changes call `updateChartType()` 
- `updateChartType()` clears ALL series and rebuilds from `this._data`
- Your `_playbackSeries` is deleted
- `this._data` is empty because you never called `setData()`
- Chart becomes blank ❌

**✅ Correct Pattern:**

```javascript
// Fetch historical data first
const initialBars = await provider.fetchHistorical('OLMA-20251118', '1');

// Set it through OakView's API
chartElement.setData(initialBars);  // ← This stores in _data

// Now subscribe to real-time updates
const unsubscribe = provider.subscribe('OLMA-20251118', '1', (bar) => {
  chartElement.updateRealtime(bar);  // ← Updates current series
});

// When chart type changes:
// - updateChartType() recreates series from _data (initialBars)
// - Your subscription continues calling updateRealtime()
// - New series receives updates ✅
```

**Real-World Example:**

See `examples/volttrading-integration/index.html` lines 315-330:

```javascript
// Load historical data
const historical = await provider.fetchHistorical(symbol, interval);
chart.setData(historical);  // ← Stores in _data

// Subscribe to real-time
const unsubscribe = provider.subscribe(symbol, interval, (bar) => {
  const currentChart = chartLayout.getChartAt(paneIndex);
  if (currentChart) {
    currentChart.updateRealtime(bar);  // ← Updates series
  }
});
```

**Summary:**
- **Recommended:** Option C from your report - "Use `subscribe()` but let OakView create the series"
- **Alternative:** For very advanced cases, you can use `getChart()` but you lose toolbar functionality
- **Bottom line:** Use `setData()` + `updateRealtime()` pattern

---

### 🟡 Issue #2: Interval Selector Auto-Update (MEDIUM)

**Status:** ✅ **BUG CONFIRMED & FIXED**

You're absolutely right! The code was calling `getBaseInterval()` but only logging it, never using the value.

**Fix Applied:**

We've added auto-update logic in `updateAvailableIntervals()`:

```javascript
// Auto-update interval to base interval when symbol changes
if (baseInterval && availableIntervals.includes(baseInterval)) {
  const currentInterval = this.getAttribute('interval');
  if (currentInterval !== baseInterval) {
    this.setAttribute('interval', baseInterval);
    
    // Update interval button text
    const intervalBtn = this.shadowRoot.querySelector('.interval-button');
    if (intervalBtn) {
      intervalBtn.textContent = this.formatIntervalDisplay(baseInterval);
    }
    
    console.log(`✓ Auto-updated interval to base interval: ${baseInterval}`);
  }
}
```

**Behavior Now:**
1. User selects symbol from search modal
2. `updateAvailableIntervals()` is called
3. Interval automatically updates to value from `getBaseInterval()`
4. Interval button shows correct value ("1" not "D")

**Commit:** Fix will be in next release

---

### 🟢 Issue #3: Legend Not Updating (LOW)

**Status:** ⚠️ **NEEDS VERIFICATION**

We have crosshair subscription implemented (`subscribeCrosshairMove()`), but we need to verify:

1. ✅ OHLCV values update on crosshair move
2. ❓ Symbol/interval labels update on changes

**Action Required:**
- We'll test this with real data
- If legend doesn't update properly, we'll add proper update logic
- Will ensure `attributeChangedCallback` triggers legend refresh

**Timeline:** Will investigate and fix within 1 week if broken

---

## 📚 Documentation Updates

### 1. Interval Format Specification

**Added to README:**

```markdown
## Supported Interval Formats

**Pattern:** `^(\d+)([mHDWMY]?)$`

**Supported:**
- **Minutes:** `1`, `5`, `15`, `30` (number only = minutes)
- **Hours:** `1H`, `2H`, `4H`, `12H`
- **Days:** `1D`, `2D`
- **Weeks:** `1W`
- **Months:** `1M`, `3M`, `6M`
- **Years:** `1Y`

**NOT Supported:**
- ❌ Seconds: `60s`
- ❌ Milliseconds: `100ms`
- ❌ Sub-minute intervals

**Unit Meanings:**
- Number only or `m` = minutes
- `H` = hours
- `D` = days
- `W` = weeks
- `M` = months
- `Y` = years

**Minimum:** `1` (1 minute)
```

---

### 2. Real-time Integration Guide

**Created:** `docs/realtime-integration.md`

**Contents:**
- Recommended pattern (setData + subscribe + updateRealtime)
- Chart type preservation
- Symbol change handling
- Subscription cleanup
- Common pitfalls
- Full working examples

**Key Points:**

```javascript
// ✅ DO THIS
chart.setData(historicalData);
const unsubscribe = provider.subscribe(symbol, interval, (bar) => {
  chart.updateRealtime(bar);
});

// ❌ DON'T DO THIS
const series = chart.getChart().addSeries(CandlestickSeries);
series.update(bar);  // Breaks toolbar
```

---

### 3. Symbol Search Field Definitions

**Enhanced TypeScript types:**

```typescript
/**
 * @property {string} symbol - Primary identifier
 *   - Used in: symbol-change event, fetchHistorical(), subscribe()
 *   - Displayed in symbol button
 * 
 * @property {string} description - Human-readable name
 *   - Displayed as secondary text in search results
 *   - Example: "Apple Inc."
 * 
 * @property {string} exchange - Exchange/Market
 *   - Displayed after description
 *   - Example: "NASDAQ"
 * 
 * @property {string} full_name - Combined name (OPTIONAL)
 *   - Used for search matching
 *   - Example: "NASDAQ:AAPL"
 * 
 * @property {string} type - Instrument type (OPTIONAL)
 *   - For filtering/categorization
 *   - Example: "stock", "crypto", "forex"
 */
```

---

## Implementation Checklist for Your Team

### Immediate Changes (Today)

- [ ] **Replace manual series creation** with `setData()` pattern
- [ ] **Fetch historical bars** from your session data
- [ ] **Call `chartElement.setData(historicalBars)`** BEFORE subscribing
- [ ] **Use `chartElement.updateRealtime(bar)`** in subscribe callback
- [ ] **Test chart type toolbar** - should work now! ✅

### Code Changes

**Before (Broken):**
```javascript
const unsubscribe = provider.subscribe('replay', '1', (bar) => {
  if (!paneChart._playbackSeries) {
    const lwChart = paneChart.getChart();
    paneChart._playbackSeries = lwChart.addSeries(CandlestickSeries, {...});
  }
  paneChart._playbackSeries.update(barData);  // ❌ Breaks toolbar
});
```

**After (Working):**
```javascript
// 1. Load historical session bars
const sessionBars = await loadSessionBars('OLMA-20251118');

// 2. Set them through OakView
chartElement.setData(sessionBars);  // ← Key change!

// 3. Subscribe for replay ticks
const unsubscribe = provider.subscribe('replay', '1', (bar) => {
  chartElement.updateRealtime(bar);  // ✅ Toolbar works!
});
```

---

## Timeline

| Item | Status | ETA |
|------|--------|-----|
| Interval auto-update fix | ✅ **DONE** | Today |
| Documentation updates | 📝 **IN PROGRESS** | 1-2 days |
| Legend verification | 🔍 **INVESTIGATING** | 3-5 days |
| Real-time integration guide | 📚 **WRITING** | 2-3 days |
| Example update | 💻 **PLANNED** | 1 week |

---

## Need Help?

If you have questions about the implementation:

1. **Check the examples:**
   - `examples/volttrading-integration/` - Real-time pattern
   - `examples/websocket-example/` - Subscribe pattern

2. **Test with validator:**
   ```javascript
   import { validateDataProvider } from 'oakview/validator';
   validateDataProvider(provider, { testRealtime: true });
   ```

3. **Enable debug logging:**
   ```javascript
   // See what OakView is doing
   localStorage.setItem('oakview:debug', 'true');
   ```

4. **Contact us:**
   - Create GitHub issue
   - Include code sample
   - Share console logs

---

## Thank You Again! 🚀

Your report was incredibly valuable:
- ✅ Identified interval auto-update bug
- ✅ Highlighted documentation gaps
- ✅ Helped us understand real-time use cases better

We're excited you're using OakView for your replay system. Please let us know if the suggested pattern works for you!

---

**OakView Development Team**  
*Building better charting tools together*

