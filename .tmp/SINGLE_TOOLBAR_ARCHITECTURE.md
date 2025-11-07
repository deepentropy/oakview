# Single Toolbar Architecture

## Summary

Refactored the layout system to have a **single centralized toolbar** at the top that controls whichever chart pane has focus, instead of duplicating toolbars for each chart.

## Architecture Changes

### Before:
```
┌─────────────────────────────────────┐
│  Chart 1 with Toolbar               │
├─────────────────────────────────────┤
│  Chart 2 with Toolbar               │
└─────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────┐
│  Single Shared Toolbar (Controls)   │
├─────────────────────────────────────┤
│  Chart 1 (No Toolbar)               │
├─────────────────────────────────────┤
│  Chart 2 (No Toolbar)               │
└─────────────────────────────────────┘
```

## Implementation Details

### 1. Layout Structure (oakview-chart-layout.js)

**New DOM Structure:**
```html
<div class="layout-wrapper">
  <div class="toolbar-container">
    <oakview-chart class="control-chart" show-toolbar="true">
      <!-- Only toolbar visible (38px height, overflow hidden) -->
    </oakview-chart>
  </div>
  <div class="layout-container">
    <!-- Chart panes WITHOUT toolbars -->
    <div class="chart-pane">
      <oakview-chart show-toolbar="false"></oakview-chart>
    </div>
    <!-- More panes... -->
  </div>
</div>
```

### 2. Control Flow

**Toolbar → Focused Chart:**
1. User clicks a chart pane → Pane becomes "focused" (blue border)
2. User interacts with toolbar (change interval, chart style, etc.)
3. Control chart dispatches event (e.g., `interval-change`)
4. Layout component catches event
5. Layout component applies change to currently focused chart

**Example Event Flow:**
```javascript
// Control toolbar dispatches event
controlChart.addEventListener('interval-change', (e) => {
  const selectedChart = this.getSelectedChart();
  if (selectedChart) {
    // Forward to focused chart
    this.dispatchEvent(new CustomEvent('interval-change', {
      detail: {
        interval: e.detail.interval,
        paneIndex: this._selectedPane
      }
    }));
  }
});
```

### 3. Key Methods

**`setupControlChartListeners()`**
- Sets up event listeners on the control toolbar
- Forwards toolbar events to the focused chart
- Handles layout changes directly

**`selectPane(index)`**
- Updates visual selection (blue border)
- Syncs control toolbar to reflect focused chart's state
- Updates symbol/interval display in toolbar

**`getSelectedChart()`**
- Returns the currently focused chart instance
- Used by control handlers to apply changes

### 4. CSS Styling

**Control Chart:**
```css
.control-chart {
  height: 38px;      /* Match toolbar height */
  overflow: hidden;  /* Hide chart area */
}
```

**Layout Wrapper:**
```css
.layout-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar-container {
  flex-shrink: 0;  /* Fixed height */
}

.layout-container {
  flex: 1;         /* Takes remaining space */
  display: grid;   /* Grid for chart panes */
}
```

## Benefits

1. **No Duplication** - Only one toolbar, cleaner UI
2. **Consistent UX** - Matches TradingView and professional trading platforms
3. **Focused Workflow** - Clear which chart you're controlling
4. **Resource Efficient** - Fewer DOM elements and event listeners
5. **Easier Maintenance** - Single source of truth for toolbar state

## Usage

### Basic Usage:
```html
<oakview-chart-layout
    layout="2x2"
    symbol="SPX"
    theme="dark"
    data-source="data.csv">
</oakview-chart-layout>
```

### Focus Flow:
1. Click any chart pane to focus it (blue border appears)
2. Use toolbar controls - they apply to focused chart
3. Change layouts - toolbar persists, charts reorganize

### Listening to Events:
```javascript
const layout = document.querySelector('oakview-chart-layout');

// Listen for control changes
layout.addEventListener('interval-change', (e) => {
  console.log('Interval changed on pane', e.detail.paneIndex);
  console.log('New interval:', e.detail.interval);
});

// Listen for pane selection
layout.addEventListener('pane-selected', (e) => {
  console.log('Pane', e.detail.paneIndex, 'is now focused');
});
```

## Testing

Access: **http://localhost:5177/**

1. **Single Layout:**
   - Should see one toolbar at top, one chart below
   - Chart has no duplicate toolbar

2. **Multi-Chart Layouts:**
   - Select 2x2 or other multi-chart layout
   - Should see ONE toolbar at top
   - Charts below have NO individual toolbars
   - Click different charts - blue border shows focus
   - Change interval/style - applies to focused chart only

3. **Toolbar Controls:**
   - All toolbar buttons should work normally
   - Layout button changes the grid layout
   - Interval/style changes affect focused chart

## Future Enhancements

- [ ] Persist focused pane when switching layouts
- [ ] Keyboard shortcuts for pane navigation
- [ ] Show pane number/identifier in toolbar
- [ ] Sync certain controls across all panes (optional)
- [ ] Per-pane settings indicator
- [ ] Split layout types (horizontal/vertical sliders)

## Migration Notes

If you're using the old `oakview-chart` directly:

**Old:**
```html
<oakview-chart show-toolbar="true" symbol="SPX"></oakview-chart>
```

**New:**
```html
<oakview-chart-layout layout="single" symbol="SPX"></oakview-chart-layout>
```

The layout component now manages the toolbar centrally.
