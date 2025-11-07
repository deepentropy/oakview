# OakView Chart Layout Implementation

## Overview

Implemented a multi-chart layout system for OakView, similar to TradingView's layout functionality. This allows users to view multiple charts simultaneously in various grid configurations.

## Files Created

### 1. `src/oakview-chart-layout.js`
The main layout component that wraps multiple `oakview-chart` instances in a grid layout.

**Features:**
- Supports 6 layout modes: single, 2x1, 1x2, 2x2, 3x1, 1x3
- Dynamic layout switching
- Pane selection with visual feedback
- Automatic chart initialization for each pane
- Event dispatching for pane selection

**Usage:**
```html
<oakview-chart-layout
    layout="2x2"
    symbol="SPX"
    theme="dark"
    data-source="data.csv">
</oakview-chart-layout>
```

**API:**
```javascript
const layout = document.querySelector('oakview-chart-layout');

// Change layout
layout.setLayout('2x2');

// Get current layout
const currentLayout = layout.getLayout();

// Access specific chart
const chart = layout.getChartAt(0);

// Get all charts
const allCharts = layout.getAllCharts();

// Listen for pane selection
layout.addEventListener('pane-selected', (event) => {
    console.log('Selected pane:', event.detail.paneIndex);
});
```

### 2. `example/layout-demo.html`
Demo page showcasing the layout functionality with a clean UI for switching between layouts.

**Features:**
- Layout selector buttons with visual icons
- Active state indication
- Click to select panes
- Responsive design

## Supported Layouts

| Layout | Description | Grid |
|--------|-------------|------|
| single | Single chart | 1x1 |
| 2x1 | 2 charts horizontally | 2 columns, 1 row |
| 1x2 | 2 charts vertically | 1 column, 2 rows |
| 2x2 | 4 charts in grid | 2x2 grid |
| 3x1 | 3 charts horizontally | 3 columns, 1 row |
| 1x3 | 3 charts vertically | 1 column, 3 rows |

## Implementation Details

### Component Structure
```
oakview-chart-layout (web component)
├── Shadow DOM
│   ├── Styles (grid layouts)
│   └── Layout Container
│       └── Chart Panes
│           └── oakview-chart instances
```

### Styling
- Uses CSS Grid for layout
- 1px gap between panes
- Selected pane has blue border (#2962ff)
- Hover effect for better UX
- Dark theme by default

### Event Flow
1. User clicks layout button
2. `setLayout()` method called
3. Component updates layout attribute
4. `attributeChangedCallback` triggered
5. `updateLayout()` recreates panes
6. Charts initialized in each pane

## Testing

Access the demo at: `http://localhost:5177/layout-demo.html`

1. Click different layout buttons to switch layouts
2. Click on charts to select panes (blue border indicates selection)
3. Each chart loads the same data but can be independently configured
4. Layouts are responsive and fill the viewport

## Future Enhancements

- [ ] Per-pane timeframe selection
- [ ] Per-pane symbol selection
- [ ] Layout persistence (save/load layouts)
- [ ] Custom layout builder
- [ ] Synchronized crosshairs across panes
- [ ] Linked price scales
- [ ] Layout templates
- [ ] Drag-and-drop pane reordering

## Integration with Toolbar

To add layout selection to the existing toolbar in `oakview-chart-ui.js`, you can:

1. Add a layout dropdown button similar to the interval dropdown
2. Include layout icons in the dropdown menu
3. Dispatch custom events when layout changes
4. Listen for these events in the parent container

Example toolbar addition:
```html
<div class="toolbar-group dropdown">
  <button class="toolbar-button layout-button">
    <svg><!-- grid icon --></svg>
  </button>
  <div class="layout-dropdown-menu dropdown-menu">
    <!-- Layout options with icons -->
  </div>
</div>
```

## Notes

- The layout component uses the existing `oakview-chart` component with toolbar
- Each pane creates an independent chart instance
- Data loading is handled by the underlying `oakview-chart` component
- The component is fully self-contained in Shadow DOM
