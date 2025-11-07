# Layout Button Added to Toolbar

## Summary

I've successfully added a layout selector button to the toolbar in the OakView chart component. This allows users to switch between different chart layouts directly from the chart's toolbar.

## Changes Made

### 1. Added Layout Button to Toolbar (src/oakview-chart-ui.js)

**Location:** Between the Chart Style dropdown and the Indicators button (line 1134-1201)

**HTML Added:**
```html
<div class="toolbar-group dropdown">
  <button class="toolbar-button layout-button" aria-label="Layout">
    <!-- Grid icon SVG -->
  </button>
  <div class="layout-dropdown-menu dropdown-menu">
    <!-- 6 layout options with icons -->
  </div>
</div>
```

**Layout Options:**
- Single (1 chart)
- 2 Horizontal (2x1)
- 2 Vertical (1x2)
- 2×2 Grid (4 charts)
- 3 Horizontal (3x1)
- 3 Vertical (1x3)

### 2. Added Event Handlers (src/oakview-chart-ui.js)

**Location:** In `setupEventListeners()` method (line 1523-1570)

**Features:**
- Click to open/close dropdown
- Auto-close other dropdowns when layout dropdown opens
- Active state tracking for selected layout
- Dispatches custom `layout-change` event with `bubbles: true` and `composed: true`

**Event Details:**
```javascript
this.dispatchEvent(new CustomEvent('layout-change', {
  detail: { layout },  // e.g., 'single', '2x1', '1x2', '2x2', '3x1', '1x3'
  bubbles: true,
  composed: true
}));
```

### 3. Updated Main Example (example/index.html)

Changed from single `oakview-chart` to `oakview-chart-layout`:

```html
<oakview-chart-layout
    id="chartLayout"
    layout="single"
    symbol="SPX"
    theme="dark"
    data-source="SP_SPX, 1D.csv">
</oakview-chart-layout>

<script type="module">
    import '../src/oakview-chart-layout.js';

    // Listen for layout changes from any chart's toolbar
    window.addEventListener('layout-change', (event) => {
        document.getElementById('chartLayout').setLayout(event.detail.layout);
    });
</script>
```

## How It Works

### User Flow:
1. User clicks the layout button in the toolbar (grid icon)
2. Dropdown menu appears showing 6 layout options with visual icons
3. User selects a layout option
4. `layout-change` event is dispatched from the chart component
5. Parent container listens for the event and updates the layout

### Event Bubbling:
The `layout-change` event uses:
- `bubbles: true` - So it propagates up the DOM tree
- `composed: true` - So it crosses shadow DOM boundaries

This allows the event to be caught by parent elements or at the window level, even though the button is inside the chart's shadow DOM.

## Testing

Access the updated demo at: **http://localhost:5177/**

1. Open the page in your browser
2. Look for the new layout button in the toolbar (grid icon, left of the Indicators button)
3. Click it to see the dropdown with layout options
4. Select different layouts to see the charts reorganize

## Visual Design

The layout button follows the same design pattern as other toolbar buttons:
- Dark background matching the toolbar
- Hover effects
- Dropdown menu styled like interval and chart style dropdowns
- SVG icons showing visual representation of each layout
- Active state indication

## Integration

To use this in your own project:

```html
<!-- Wrap your chart in oakview-chart-layout -->
<oakview-chart-layout id="layout" layout="single">
</oakview-chart-layout>

<script>
  // Listen for layout changes
  window.addEventListener('layout-change', (e) => {
    document.getElementById('layout').setLayout(e.detail.layout);
  });
</script>
```

Or use it with any custom container that can listen for the event and update the layout accordingly.

## Notes

- The layout button is visible in ALL charts, even when used in multi-chart layouts
- Each chart can trigger a layout change
- The event bubbles up so a single listener at the window or container level can handle all layout changes
- The dropdown automatically closes when clicking outside or selecting an option
- Other dropdowns (interval, chart style) automatically close when the layout dropdown opens
