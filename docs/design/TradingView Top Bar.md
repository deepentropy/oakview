# TradingView Top Bar - Design Specification

## Overview
This document provides pixel-perfect specifications for reproducing the TradingView top bar interface.

**Data Sources:**
- Screenshot analysis
- HTML structure
- Computed CSS styles (exact values marked with ⚠️)

---

## Quick Reference - Exact Values

| Property | Value | Source |
|----------|-------|--------|
| **Bar Height** | `38px` | Computed Style |
| **Bar Background** | `#131722` | CSS Variable `--_0-x-T-` |
| **Font Size** | `14px` | Computed Style |
| **Font Family** | `-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif` | Computed Style |
| **Text Color** | `#dbdbdb` (rgb(219, 219, 219)) | Computed Style |
| **Brand Blue** | `#2962ff` | CSS Variable `--color-tv-blue-500` |
| **Divider Color** | `#4a4a4a` | CSS Variable `--color-toolbar-divider-background` |
| **Button Hover BG** | `#2e2e2e` | CSS Variable `--color-toolbar-button-background-hover` |
| **Button Active BG** | `#132042` | CSS Variable `--color-toolbar-button-background-active` |

---

## Layout Structure

### Overall Bar
- **Position:** `absolute`
- **Top:** `0px`
- **Left:** `52px`
- **Width:** `1868px` (viewport dependent)
- **Height:** `38px` ⚠️ EXACT
- **Background:** `#131722` via CSS variable `--_0-x-T-`
- **Color Scheme:** `dark`
- **Horizontal layout with left-to-right content flow**

### Content Organization
The bar contains groups of controls separated by vertical dividers, organized as follows:
1. Logo/Search section
2. Symbol management
3. Timeframe selector
4. Chart type selector
5. Indicators
6. Chart controls
7. Watchlists/Tabs
8. Utility buttons
9. Publish button (right-aligned)

---

## Separators

### Vertical Divider
- Element: `<div class="separator-xVhBjD5m separator-MBOVGQRI"></div>`
- Appears between major groups
- Visual: Thin vertical line
- Color: Subtle gray (semi-transparent white, approximately rgba(255,255,255,0.1))
- Height: Approximately 24px (vertically centered within the bar)

---

## Section 1: Symbol Search

### Search Button (KLAR)
**Button Container:**
- Class: `button-GwQQdU8S button-cq__ntSC`
- Type: Combined icon + text button
- Text: "KLAR" (uppercase)
- Styling: `uppercase-cq__ntSC`

**SVG Icon (Search/Magnifying Glass):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
  <path fill="currentColor" d="M3.5 8a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM8 2a6 6 0 1 0 3.65 10.76l3.58 3.58 1.06-1.06-3.57-3.57A6 6 0 0 0 8 2Z"></path>
</svg>
```
- Size: 18x18px
- Color: currentColor (inherits from parent, typically white/light gray)
- Tooltip: "Symbol Search"

### Add Symbol Button
**SVG Icon (Circle with Plus):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" d="M13.5 6a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM4 14.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"></path>
  <path fill="currentColor" d="M9 14h4v-4h1v4h4v1h-4v4h-1v-4H9v-1z"></path>
</svg>
```
- Size: 28x28px
- Color: currentColor
- Class: `button-ptpAHg8E withoutText-ptpAHg8E`
- Tooltip: "Compare or Add Symbol"

---

## Section 2: Timeframe Selector

### Radio Button Group
- Element: `<div class="group-S_1OCXUK" role="radiogroup">`
- Orientation: Horizontal
- Buttons displayed: 1s, 10s, 1m, 5m, D (Day)

### Individual Timeframe Buttons
**Button Classes:**
- Base: `button-S_1OCXUK button-GwQQdU8S`
- Grouped: `isGrouped-GwQQdU8S`
- Active state: `isActive-GwQQdU8S`

**Visible Options:**
1. "1s" - 1 second
2. "10s" - 10 seconds
3. "1m" - 1 minute
4. "5m" - 5 minutes
5. "D" - 1 day (ACTIVE STATE in screenshot)

### Dropdown Arrow Button
**SVG Icon (Chevron Down):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8" width="16" height="8">
  <path fill="currentColor" d="M0 1.475l7.396 6.04.596.485.593-.49L16 1.39 14.807 0 7.393 6.122 8.58 6.12 1.186.08z"></path>
</svg>
```
- Size: 16x8px
- Color: currentColor
- Class: `menu-S_1OCXUK button-merBkM5y`
- Tooltip: "Chart interval"

---

## Section 3: Chart Type Selector

### Bars Button
**SVG Icon (Candlestick/Bar Chart):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" d="M19 6h-1v7h-3v1h3v8h1v-3h3v-1h-3V6ZM11 7h-1v13H7v1h3v2h1V10h3V9h-3V7Z"></path>
</svg>
```
- Size: 28x28px
- Color: currentColor
- Class: `menu-b3Cgff6l button-merBkM5y`
- Tooltip: "Bars"

---

## Section 4: Indicators

### Indicators Button
**Button Layout:**
- Type: Icon + Text
- Text: "Indicators"
- Class: `button-ptpAHg8E withText-ptpAHg8E`

**SVG Icon (Chart with Bars):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
  <path stroke="currentColor" d="M6 12l4.8-4.8a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 0 1.3.1L23 5"></path>
  <path fill="currentColor" fill-rule="evenodd" d="M19 12a1 1 0 0 0-1 1v4h-3v-1a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v2H7a1 1 0 0 0-1 1v4h17V13a1 1 0 0 0-1-1h-3zm0 10h3v-9h-3v9zm-1 0v-4h-3v4h3zm-4-4.5V22h-3v-6h3v1.5zM10 22v-3H7v3h3z"></path>
</svg>
```
- Size: 28x28px
- Mixed fill and stroke
- Tooltip: "Indicators, metrics, and strategies"
- Hotkey: "/" (slash)

### Favorites Dropdown
- Same chevron down icon as timeframe selector
- Size: 16x8px
- Tooltip: "Favorites"

### Templates Button
**SVG Icon (Grid/Template):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" fill-rule="evenodd" d="M8 7h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM6 8c0-1.1.9-2 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8zm11-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm-2 1c0-1.1.9-2 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8zm-4 8H8a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zm-3-1a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H8zm9 1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm-2 1c0-1.1.9-2 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3z"></path>
</svg>
```
- Size: 28x28px
- Displays a 2x2 grid pattern
- Tooltip: "Indicator templates"

---

## Section 5: Chart Controls

### Alert Button
**SVG Icon (Bell):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" d="M14.5 4A7.5 7.5 0 0 0 7 11.5V18H6v1h7.5a2.5 2.5 0 0 0 4.992-.5H21v-1h-1v-6.5A7.5 7.5 0 0 0 14.5 4zM8 11.5A6.5 6.5 0 0 1 14.5 5 6.5 6.5 0 0 1 21 11.5V18H8v-6.5zm6.5 7.5a1.5 1.5 0 0 0 1.5-1.5h-3a1.5 1.5 0 0 0 1.5 1.5z"></path>
</svg>
```
- Size: 28x28px
- Color: currentColor
- Tooltip: "Alert"

### Replay Button
**SVG Icon (Replay/History):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" d="M14 5a9 9 0 0 0-9 9v1H4v-1a10 10 0 0 1 18-6.15l-.7.7A8.98 8.98 0 0 0 14 5zM5.55 8.45l.7.7A8.98 8.98 0 0 0 14 23a9 9 0 0 0 9-9v-1h1v1a10 10 0 0 1-18 6.15l.7-.7zM7 14v-1h6v6h-1v-5z"></path>
</svg>
```
- Size: 28x28px
- Color: currentColor
- Tooltip: "Replay"

### Undo Button
**SVG Icon (Curved Arrow Left):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" d="M11.5 6 5.207 12.293l-.353.354.353.353L11.5 19.293 12.207 18.586 7.121 13.5H21.5A2.5 2.5 0 0 1 24 16v5h1v-5a3.5 3.5 0 0 0-3.5-3.5H7.121l5.086-5.086L11.5 6Z"></path>
</svg>
```
- Size: 28x28px
- Color: currentColor
- Tooltip: "Undo" or similar

### Redo Button (implied, similar to Undo but mirrored)

---

## Section 6: Watchlist/Tabs

### Tab Items
- Circular indicators with letters inside
- Active tab has filled background
- Letters visible: D, S, S, W
- Class: `round-KMkDzD5K`
- Active class: `active-KMkDzD5K`

**Structure:**
- "Daily" (D) - Active
- "Screener - Premarket" (S)
- "Swing Multi" (S)
- "WT" (W)

---

## Section 7: Utility Buttons

### Quick Search Button
**SVG Icon (Lightning Bolt with Magnifier):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
  <path d="M17 4v4h2a1 1 0 0 1 .83 1.55l-4 6A1 1 0 0 1 14 15v-4h-2a1 1 0 0 1-.83-1.55l4-6A1 1 0 0 1 17 4m-2 11 4-6h-3V4l-4 6h3z"></path>
  <path d="M5 13.5a7.5 7.5 0 0 1 6-7.35v1.02A6.5 6.5 0 1 0 18.98 13h1l.02.5a7.47 7.47 0 0 1-1.85 4.94L23 23.29l-.71.7-4.85-4.84A7.5 7.5 0 0 1 5 13.5"></path>
</svg>
```
- Size: 28x28px
- ID: `header-toolbar-quick-search`
- Tooltip: "Quick Search"
- Hotkey: Ctrl+K

### Settings Button
**SVG Icon (Hexagon/Settings):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
  <path fill-rule="evenodd" d="M18 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-1 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
  <path fill-rule="evenodd" d="M8.5 5h11l5 9-5 9h-11l-5-9 5-9Zm-3.86 9L9.1 6h9.82l4.45 8-4.45 8H9.1l-4.45-8Z"></path>
</svg>
```
- Size: 28x28px
- ID: `header-toolbar-properties`
- Tooltip: "Settings"

### Fullscreen Button
**SVG Icon (Expand Corners):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <path fill="currentColor" d="M8.5 6A2.5 2.5 0 0 0 6 8.5V11h1V8.5C7 7.67 7.67 7 8.5 7H11V6H8.5zM6 17v2.5A2.5 2.5 0 0 0 8.5 22H11v-1H8.5A1.5 1.5 0 0 1 7 19.5V17H6zM19.5 7H17V6h2.5A2.5 2.5 0 0 1 22 8.5V11h-1V8.5c0-.83-.67-1.5-1.5-1.5zM22 19.5V17h-1v2.5c0 .83-.67 1.5-1.5 1.5H17v1h2.5a2.5 2.5 0 0 0 2.5-2.5z"></path>
</svg>
```
- Size: 28x28px
- ID: `header-toolbar-fullscreen`
- Tooltip: "Fullscreen mode"
- Hotkey: Shift+F

### Screenshot Button
**SVG Icon (Camera):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.118 6a.5.5 0 0 0-.447.276L9.809 8H5.5A1.5 1.5 0 0 0 4 9.5v10A1.5 1.5 0 0 0 5.5 21h16a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 21.5 8h-4.309l-.862-1.724A.5.5 0 0 0 15.882 6h-4.764zm-1.342-.17A1.5 1.5 0 0 1 11.118 5h4.764a1.5 1.5 0 0 1 1.342.83L17.809 7H21.5A2.5 2.5 0 0 1 24 9.5v10a2.5 2.5 0 0 1-2.5 2.5h-16A2.5 2.5 0 0 1 3 19.5v-10A2.5 2.5 0 0 1 5.5 7h3.691l.585-1.17z"></path>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M13.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 1a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z"></path>
</svg>
```
- Size: 28x28px
- ID: `header-toolbar-screenshot`
- Tooltip: "Take a snapshot"

---

## Section 8: Publish Button (Right-Aligned)

### Button Structure
**Classes:**
- Container: `button-O36zDbH4 variant-round-O36zDbH4 color-blue-O36zDbH4`
- Interactive: `interactive-O36zDbH4`
- Background: `bg-O36zDbH4 blackButton-O36zDbH4`

**Text:** "Publish"

**Tablet/Icon-Only Version:**
Uses the lightbulb icon:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
  <path fill="currentColor" d="M3 7.63C3 4.52 5.69 2 9 2s6 2.52 6 5.63c0 1.82-.93 3.64-2.4 4.69v2.43c0 .4-.35.75-.8.75H11v.74c0 .42-.34.76-.8.76H7.8a.77.77 0 0 1-.8-.76v-.74h-.8c-.44 0-.8-.34-.8-.75v-2.43A5.88 5.88 0 0 1 3 7.62Zm3.2 4.87v.75h5.6v-.75H6.2Zm5.87-.75a5.14 5.14 0 0 0 2.13-4.13c0-2.69-2.33-4.87-5.2-4.87S3.8 4.93 3.8 7.63c0 1.62.85 3.23 2.13 4.12h6.14ZM6.2 14v.75h5.6V14H6.2Zm1.6 1.5v.75h2.4v-.75H7.8ZM8.6 8v3h.8V8h3.2v-.75H9.4v-3h-.8v3H5.4V8h3.2Z"></path>
</svg>
```
- Size: 18x18px
- Shows lightbulb with "idea" cross inside
- Tooltip: "Share your idea with the trade community"

---

## Button States & Styling

### General Button Properties
- Border radius: Appears rounded (approximately 4-6px)
- Padding: Approximately 6-8px horizontal, 4-6px vertical
- Font: Sans-serif, medium weight
- Font size: Approximately 12-14px

### Interactive States
1. **Normal:** Semi-transparent white/gray color
2. **Hover:** Slightly brighter
3. **Active:** `isActive-GwQQdU8S` class - filled background or highlighted state
4. **Focus:** Likely has focus ring (accessibility)

### Icon Buttons
- Size: Typically 28x28px or 32x32px hit area
- Icon size: 18x18px or 28x28px SVG
- Padding: Minimal (2-4px)

---

## Typography

### Button Text
- **Font family:** `-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif` ⚠️ EXACT
- **Font size:** `14px` ⚠️ EXACT
- **Font feature settings:** `"lnum", "tnum"` (for consistent number spacing)
- **Font weight:** 500 (medium) - typical for buttons
- **Color:** `#dbdbdb` (rgb(219, 219, 219)) ⚠️ EXACT
- **Text transform:** None (except "KLAR" which is uppercase)

---

## Colors (Exact Values from Computed Styles)

### Background Colors
- **Main bar background:** `#131722` ⚠️ EXACT
- **Button hover:** `#2e2e2e` (via `--color-toolbar-button-background-hover`)
- **Button active:** `#132042` (via `--color-toolbar-button-background-active`)
- **Button active hover:** `#142e61` (via `--color-toolbar-button-background-active-hover`)
- **Secondary button hover:** `#3d3d3d` (via `--color-toolbar-button-background-secondary-hover`)

### Text & Icon Colors
- **Primary text:** `#dbdbdb` (rgb(219, 219, 219)) ⚠️ EXACT
- **Secondary text:** `#8c8c8c` (via `--color-text-secondary`)
- **Tertiary text:** `#9c9c9c` (via `--color-text-tertiary`)
- **Button text normal:** `#dbdbdb` (via `--color-toolbar-button-text`)
- **Button text hover:** `#dbdbdb` (via `--color-toolbar-button-text-hover`)
- **Button text active:** `#2962ff` (via `--color-toolbar-button-text-active`)
- **Button text active hover:** `#1e53e5` (via `--color-toolbar-button-text-active-hover`)
- **Toggle button icon:** `#575757` (via `--color-toolbar-toggle-button-icon`)

### Interactive Element Colors
- **Primary blue (brand):** `#2962ff` ⚠️ EXACT (via `--color-tv-blue-500`)
- **Blue hover:** `#1e53e5` (via `--color-tv-blue-600`)
- **Blue darker:** `#1848cc` (via `--color-tv-blue-700`)

### Divider Colors
- **Toolbar divider:** `#4a4a4a` ⚠️ EXACT (via `--color-toolbar-divider-background`)

### Utility Colors
- **Success/Green:** `#089981` (via `--color-success`)
- **Error/Red:** `#f23645` (via `--color-text-field-label-error`)
- **Warning/Orange:** `#ff9800` (via `--color-warning`)
- **White:** `#fff` (via `--color-white`)
- **Black:** `#000` (via various CSS variables)
- **Transparent:** `rgba(0, 0, 0, 0)` or `transparent`

### Publish Button Colors
- **Background:** `#2962ff` (blue)
- **Background hover:** `#1e53e5` (via `--color-toolbar-toggle-button-background-active-hover`)
- **Text:** `#ffffff` (white)

---

## Spacing & Layout

### Group Spacing
- Between groups: 8-12px
- Internal button spacing: 2-4px (for grouped buttons like timeframes)

### Separator Margins
- Left/Right: 8-10px from adjacent groups

### Overall Padding
- Bar padding: 8-12px horizontal
- Vertical centering: Flex or auto margins

---

## Accessibility Features

### ARIA Attributes
- `aria-label` on all icon buttons
- `role="radiogroup"` for timeframe selector
- `role="radio"` for individual timeframe buttons
- `aria-checked` states
- `aria-haspopup="menu"` for dropdown triggers
- Tooltip attributes via `data-tooltip`

### Keyboard Support
- `tabindex="-1"` used (likely managed by keyboard navigation system)
- Hotkeys displayed in tooltips
- Focus management attributes

---

## Responsive Behavior

### Desktop vs Mobile
- Desktop: Full button labels visible
- Mobile: Some buttons become icon-only
- Publish button: Full on desktop, icon-only on tablet/mobile

### Classes for Responsive States
- `desktopPublish-OhqNVIYA` - Desktop version
- `mobilePublish-OhqNVIYA` - Mobile version
- `tabletButton-yRWAMXSg` - Tablet-specific button

---

## Technical Notes

### CSS Class Naming Pattern
- Uses BEM-like methodology with hash suffixes (e.g., `-GwQQdU8S`)
- Indicates CSS modules or similar scoping system

### Button Component Types
- `button-ptpAHg8E` - Primary button type
- `withText-ptpAHg8E` - Button with text
- `withoutText-ptpAHg8E` - Icon-only button
- `button-merBkM5y` - Menu button variant
- `button-GwQQdU8S` - Base button class

---

## Implementation Recommendations

1. **SVG Icons:** Use inline SVG with `currentColor` for easy theming
2. **Tooltips:** Implement via `data-tooltip` attribute system
3. **States:** Use CSS classes for active/hover/focus states
4. **Spacing:** Use flexbox with gap property for consistent spacing
5. **Responsive:** Use media queries to show/hide text labels
6. **Accessibility:** Maintain all ARIA attributes and keyboard support

---

## Missing Information / Approximations

The following still cannot be determined with absolute precision from the provided data:

**Layout & Spacing:**
- Individual button padding values (approximations: 6-8px horizontal, 4-6px vertical based on visual)
- Exact spacing between button groups (approximation: 8-12px)
- Icon button hit area exact dimensions (approximation: 28x28px or 32x32px)
- Border radius values (approximation: 4-6px based on visual)
- Separator exact margins from adjacent groups (approximation: 8-10px)

**Visual Effects:**
- Box shadow values (if any)
- Transition/animation durations
- Z-index layering for dropdowns
- Hover state opacity/brightness calculations
- Focus ring specifications

**Dropdown Details:**
- Dropdown menu contents and styling
- Menu positioning offsets
- Menu shadow/elevation values
- Dropdown animation properties

**What We Have (Exact):**
✅ Bar height: 38px
✅ Font family, size, and features
✅ All color hex values
✅ All SVG icon paths and viewBoxes
✅ Position and basic layout structure
✅ CSS variable names and their values
✅ Button states and their color mappings

For the missing measurements, your designer should:
1. Use browser DevTools "Computed" tab on individual buttons/elements
2. Measure padding/margins with DevTools element inspector
3. Check "Layout" panel in DevTools for box model dimensions
4. Inspect pseudo-elements (:hover, :focus) for effect values