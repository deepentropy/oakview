# Legend Update Issue - Status Report

**Date:** 2025-11-20  
**Session:** Legend Symbol/Interval Display

## Problem

The legend (symbol + interval display) in OakView charts is not updating when:
1. Data is loaded programmatically via CSV example  
2. User changes interval via dropdown
3. User changes symbol via search

Currently shows default `AAPL • 1D` regardless of actual loaded data.

## Root Cause

OakView uses a **dual-chart architecture**:

1. **Control Chart** - Top toolbar with legend, symbol search, interval selector
   - Located in `<oak-view>` shadow DOM
   - Class: `.control-chart`
   - Purpose: UI controls only, no data

2. **Pane Charts** - Actual chart instances with data
   - Located in `.chart-pane` elements  
   - Updated by CSV example with `setData()`
   - Have correct symbol/interval attributes

**The issue:** Control chart legend shows its own attributes, NOT the pane chart attributes.

## What Was Tried

### ✅ Working
- `interval` added to `observedAttributes` 
- `attributeChangedCallback` calls `updateLegend()`
- `setData()` calls `updateLegend()`  
- Pane charts correctly update their legends

### ❌ Not Working
- Control chart legend not syncing with pane charts
- `chart.shadowRoot.querySelector('.control-chart')` access from CSV example
- `chart.selectPane(0)` to trigger sync
- Direct attribute setting on control chart

## Code Changes Made

**src/oak-view-chart.js:**
```javascript
// Added 'interval' to observedAttributes
static get observedAttributes() {
  return ['width', 'height', 'theme', 'symbol', 'interval', ...];
}

// Update legend when attributes change
attributeChangedCallback(name, oldValue, newValue) {
  if (name === 'symbol' || name === 'interval') {
    this.updateLegend(symbol, interval);
  }
}

// Update legend when data changes
setData(data) {
  this._data = data;
  this.updateChartType();
  this.updateLegend(this.getAttribute('symbol'), this.getAttribute('interval'));
}
```

**src/oak-view-layout.js:**
```javascript
// Sync control chart when pane selected
selectPane(index) {
  const settings = this._paneSettings.get(paneId);
  if (controlChart && settings) {
    controlChart.setAttribute('symbol', settings.symbol);
    controlChart.setAttribute('interval', settings.interval || '1D');
  }
}
```

**examples/csv-example/index.html:**
```javascript
async function loadSymbol(symbol, interval) {
  // ... load data ...
  
  // Update pane charts
  for (let i = 0; i < chartCount; i++) {
    chartElement.setAttribute('symbol', symbol);
    chartElement.setAttribute('interval', interval);
    chartElement.setData(currentData);
  }
  
  // Update pane settings
  if (chart._paneSettings) {
    settings.symbol = symbol;
    settings.interval = interval;
  }
  
  // Try to update control chart (NOT WORKING)
  const controlChart = chart.shadowRoot?.querySelector('.control-chart');
  if (controlChart) {
    controlChart.setAttribute('symbol', symbol);
    controlChart.setAttribute('interval', interval);
  }
}
```

## Test Results

**Playwright Tests:**  
`tests/legend.spec.js`

```
✓ legend shows correct symbol and interval (after 3s wait)
  Expected: QQQ @ 60
  Actual: AAPL @ 1D  ❌

✗ legend updates when interval changes
  Expected: 120 after clicking 2H
  Actual: 1D  ❌

✗ legend updates when symbol changes  
  Error: Cannot find symbol search input  ❌
```

## Next Steps (for future session)

### Option A: Single Source of Truth
Make control chart pull legend data FROM selected pane chart:

```javascript
// In control chart's updateLegend()
const layout = this.closest('oak-view-layout');
const selectedPane = layout.getSelectedChart();
if (selectedPane) {
  symbol = selectedPane.getAttribute('symbol');
  interval = selectedPane.getAttribute('interval');
}
```

### Option B: Data Provider Integration
Use `loadSymbolData()` API properly:

```javascript
// Instead of manual setData()
for (let i = 0; i < chartCount; i++) {
  const chartElement = chart.getChartAt(i);
  await chartElement.loadSymbolData(symbol, interval);
}
```

This would:
- Set attributes automatically
- Call `updateLegend()` internally
- Trigger `attributeChangedCallback`

### Option C: Event-Based Sync
Fire custom event when pane data loads:

```javascript
chartElement.dispatchEvent(new CustomEvent('data-loaded', {
  detail: { symbol, interval }
}));

// Layout listens and updates control chart
layout.addEventListener('data-loaded', (e) => {
  controlChart.setAttribute('symbol', e.detail.symbol);
  controlChart.setAttribute('interval', e.detail.interval);
});
```

## Recommended Approach

**Option B** - Use `loadSymbolData()` API properly.

The CSV example should NOT manually call `setData()` and `setAttribute()`. Instead:

```javascript
async function loadSymbol(symbol, interval) {
  const chartCount = chart.getChartCount();
  
  for (let i = 0; i < chartCount; i++) {
    const chartElement = chart.getChartAt(i);
    
    // This handles everything internally:
    // - Fetches from provider
    // - Resamples if needed
    // - Sets attributes
    // - Updates legend
    await chartElement.loadSymbolData(symbol, interval);
  }
  
  // Sync control chart
  chart.selectPane(0); // This should now work
}
```

BUT: Need to verify `loadSymbolData()` works correctly with CSV provider and that pane settings get updated.

## Files Modified

- `src/oak-view-chart.js`
- `src/oak-view-layout.js`
- `examples/csv-example/index.html`
- `tests/legend.spec.js`

## Build Status

✅ Builds successfully  
✅ Resampling feature works  
❌ Legend updates incomplete

---

**For Next Session:**  
Test Option B approach. If that doesn't work, implement Option C event-based sync.
