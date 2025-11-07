# Chart Sizing Issue - Root Cause Analysis

## Problem
Chart container has `0px` height even though host element has proper height.

## Current DOM Structure
```
:host (flex, has height: 814px) ✓
└── .main-content (flex: 1, display: flex)
    ├── .sidebar-left
    ├── .chart-area (flex: 1, display: flex, flex-direction: column)
    │   ├── .chart-container (flex: 1 1 auto) ❌ HEIGHT = 0px
    │   └── .bottom-bar (height: 24px + 4px border)
    └── .sidebar-right
```

## Root Cause
The `.chart-container` computed style shows `display: block` with `height: 0px` instead of being a flex child.

This suggests the CSS is NOT being applied correctly. Possible reasons:
1. Browser cache not cleared
2. CSS specificity issue
3. Shadow DOM style not re-rendering

## Solution: Force Height Calculation

Instead of relying on pure flex (which isn't working), we need to explicitly calculate and set the container height.

### Option 1: Use Absolute Positioning
Make `.chart-container` absolutely positioned within `.chart-area` and calculate height explicitly.

### Option 2: Use calc() with explicit heights
Set `.chart-container` height to `calc(100% - 28px)` (28px = bottom bar)

### Option 3: Use JavaScript to set height after render
After DOM renders, calculate and set explicit height on `.chart-container`

## Recommended Fix: Option 2 (Most Reliable)

Change `.chart-container` CSS to use explicit calc:

```css
.chart-container {
  flex: 1 1 auto;
  height: calc(100% - 28px); /* 24px bar + 4px border */
  position: relative;
  min-height: 0;
  overflow: hidden;
}
```

And ensure `.chart-area` has explicit height:
```css
.chart-area {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%; /* ADD THIS */
}
```
