# OakView - Local Development Usage Guide

## Local Development Setup

OakView is designed to be used as a local library during development. Here are the recommended approaches:

### Option 1: npm link (Recommended for development)
```bash
# In the oakview directory
cd /path/to/oakview
npm link

# In your project directory
cd /path/to/your-project
npm link oakview
```

This creates a symlink so changes in OakView are immediately reflected in your project.

### Option 2: Relative Path in package.json
```json
{
  "dependencies": {
    "oakview": "file:../oakview"
  }
}
```

Then run:
```bash
npm install
```

### Option 3: Direct Import (Development only)
Import directly from source files without npm:
```javascript
// Import from src directory
import '../../oakview/src/oakview-chart-layout.js';
import { OakViewDataProvider } from '../../oakview/src/data-providers/index.js';
```

**Note**: For production, you'll want to build OakView first and import the built files.

## Importing OakView in Your Project

### Development Mode (Direct import from source)

The simplest way during development is to import directly from the source files:

```javascript
// Import from source (development)
import '../../oakview/src/oakview-chart-layout.js';
import { OakViewDataProvider } from '../../oakview/src/data-providers/index.js';
```

**Advantages:**
- No build step needed
- Instant hot-reload when you modify OakView code
- Easy debugging with source maps

**Use in HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Trading App</title>
</head>
<body>
  <oakview-chart-layout id="chart" layout="single" symbol="AAPL" theme="dark"></oakview-chart-layout>

  <script type="module">
    // Direct import from OakView source
    import '../../oakview/src/oakview-chart-layout.js';

    const chart = document.getElementById('chart');
  </script>
</body>
</html>
```

### Using npm link

If you've linked OakView using `npm link`, import like a regular package:

```javascript
// After npm link, import like a package
import { OakViewChartLayout } from 'oakview';
import { OakViewDataProvider } from 'oakview';
```

**Note:** This imports from the built files in `dist/`, so you need to rebuild OakView after changes:
```bash
cd /path/to/oakview
npm run build
```

### Using Relative Path in package.json

If you specified OakView as a file dependency:

```json
{
  "dependencies": {
    "oakview": "file:../oakview"
  }
}
```

Import the same way as npm link:
```javascript
import { OakViewChartLayout } from 'oakview';
```

## Complete Example: Local Development Workflow

### Project Structure
```
my-trading-app/
├── index.html
├── providers/
│   └── my-provider.js
└── package.json

oakview/                    (sibling directory)
├── src/
│   ├── oakview-chart-layout.js
│   └── data-providers/
└── package.json
```

### Example: index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Trading App</title>
  <style>
    body {
      margin: 0;
      background: #131722;
      height: 100vh;
    }
    oakview-chart-layout {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <oakview-chart-layout id="chart" layout="single" symbol="AAPL" theme="dark"></oakview-chart-layout>

  <script type="module">
    // Import OakView from sibling directory
    import '../../oakview/src/oakview-chart-layout.js';
    import { OakViewDataProvider } from '../../oakview/src/data-providers/index.js';

    // Import your custom provider
    import MyProvider from './providers/my-provider.js';

    // Initialize
    const provider = new MyProvider();
    await provider.initialize();

    // Connect to chart
    const chart = document.getElementById('chart');
    chart.setDataProvider(provider);
  </script>
</body>
</html>
```

### Example: Custom Data Provider

```javascript
// providers/my-provider.js
import { OakViewDataProvider } from '../../oakview/src/data-providers/index.js';

// Create custom provider
class MyProvider extends OakViewDataProvider {
  async fetchHistorical(symbol, interval, from, to) {
    // Fetch from your API
    const response = await fetch(`/api/data/${symbol}?interval=${interval}`);
    const data = await response.json();

    return data.bars.map(bar => ({
      time: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume
    }));
  }

  subscribe(symbol, interval, callback) {
    // Set up WebSocket or polling
    const ws = new WebSocket(`wss://your-api.com/ws/${symbol}`);
    ws.onmessage = (event) => {
      const bar = JSON.parse(event.data);
      callback(bar);
    };

    return () => ws.close(); // Unsubscribe function
  }
}

// Use the provider
const provider = new MyDataProvider();
await provider.initialize();

const chartLayout = document.getElementById('chart');
chartLayout.setDataProvider(provider);
```

## Adding Markers and Annotations

OakView exposes the underlying lightweight-charts instances as **public properties**, giving you full access to the lightweight-charts v5 API.

### Accessing Chart Instances

```javascript
const chartLayout = document.getElementById('chart');
const chartComponent = chartLayout.getChartAt(0);

// Public properties (direct access, no getters!)
chartComponent.chart          // IChartApi - lightweight-charts chart instance
chartComponent.currentSeries  // ISeriesApi - main candlestick series
chartComponent.series         // Map - all series (indicators, etc.)
```

### Adding Price Lines (Entry, Stop-Loss, Take-Profit)

Price lines are horizontal lines at specific prices - perfect for marking trading positions:

```javascript
const chartComponent = chartLayout.getChartAt(0);

// Add entry price line
const entryLine = chartComponent.currentSeries.createPriceLine({
  price: 100.50,
  color: '#26a69a',
  lineWidth: 2,
  lineStyle: 2,  // 0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed, 4=SparseDotted
  axisLabelVisible: true,
  title: 'Entry $100.50',
});

// Add stop-loss line
const stopLoss = chartComponent.currentSeries.createPriceLine({
  price: 98.00,
  color: '#ef5350',
  lineWidth: 1,
  lineStyle: 1,
  axisLabelVisible: true,
  title: 'Stop Loss',
});

// Add take-profit line
const takeProfit = chartComponent.currentSeries.createPriceLine({
  price: 105.00,
  color: '#26a69a',
  lineWidth: 1,
  lineStyle: 1,
  axisLabelVisible: true,
  title: 'Take Profit',
});

// Remove a price line
chartComponent.currentSeries.removePriceLine(entryLine);
```

### Adding Markers (Buy/Sell Signals, Events)

Markers appear at specific time points on the chart:

```javascript
// Import from lightweight-charts
import { createSeriesMarkers } from 'lightweight-charts';

const chartComponent = chartLayout.getChartAt(0);

// Create markers manager
const markers = createSeriesMarkers(chartComponent.currentSeries, [
  {
    time: '2024-01-15',
    position: 'belowBar',  // 'aboveBar', 'belowBar', 'inBar'
    color: '#26a69a',
    shape: 'arrowUp',      // 'circle', 'square', 'arrowUp', 'arrowDown'
    text: 'BUY',
  },
  {
    time: '2024-01-20',
    position: 'aboveBar',
    color: '#ef5350',
    shape: 'arrowDown',
    text: 'SELL',
  }
]);

// Update markers
markers.setMarkers([
  { time: '2024-01-25', position: 'belowBar', color: 'blue', shape: 'circle', text: 'Signal' }
]);

// Get current markers
const currentMarkers = markers.markers();

// Clear all markers
markers.setMarkers([]);
```

### Complete Trading Example

```javascript
const chartLayout = document.getElementById('chart');
const chartComponent = chartLayout.getChartAt(0);

// Position opened
const openTime = Math.floor(Date.now() / 1000);
const entryPrice = 100.50;
const stopLoss = 98.00;
const takeProfit = 105.00;

// Add entry marker
import { createSeriesMarkers } from 'lightweight-charts';
const markers = createSeriesMarkers(chartComponent.currentSeries, [{
  time: openTime,
  position: 'belowBar',
  color: '#26a69a',
  shape: 'arrowUp',
  text: 'BUY',
}]);

// Add price lines
const lines = {
  entry: chartComponent.currentSeries.createPriceLine({
    price: entryPrice,
    color: '#26a69a',
    lineWidth: 2,
    title: `Entry $${entryPrice}`,
  }),
  stopLoss: chartComponent.currentSeries.createPriceLine({
    price: stopLoss,
    color: '#ef5350',
    lineWidth: 1,
    lineStyle: 1,
    title: 'Stop Loss',
  }),
  takeProfit: chartComponent.currentSeries.createPriceLine({
    price: takeProfit,
    color: '#26a69a',
    lineWidth: 1,
    lineStyle: 1,
    title: 'Take Profit',
  }),
};

// Position closed - cleanup
function closePosition() {
  // Remove price lines
  chartComponent.currentSeries.removePriceLine(lines.entry);
  chartComponent.currentSeries.removePriceLine(lines.stopLoss);
  chartComponent.currentSeries.removePriceLine(lines.takeProfit);

  // Add close marker
  const closeTime = Math.floor(Date.now() / 1000);
  const currentMarkers = markers.markers();
  markers.setMarkers([
    ...currentMarkers,
    {
      time: closeTime,
      position: 'aboveBar',
      color: '#ef5350',
      shape: 'arrowDown',
      text: 'CLOSE',
    }
  ]);
}
```

### Advanced: Multiple Series and Custom Overlays

Access additional series via the `series` Map:

```javascript
// Add an indicator series
const smaLine = chartComponent.chart.addLineSeries({
  color: '#2962FF',
  lineWidth: 2,
});

// Store reference
chartComponent.series.set('sma-20', smaLine);

// Use later
const sma = chartComponent.series.get('sma-20');
sma.setData([...]);
```

### Full Lightweight-Charts API Available

Since `chart` and `currentSeries` are public properties, you have access to the complete lightweight-charts v5 API:

```javascript
// Time scale operations
chartComponent.chart.timeScale().fitContent();
chartComponent.chart.timeScale().scrollToPosition(5, true);

// Price scale operations
chartComponent.currentSeries.priceScale().applyOptions({
  scaleMargins: { top: 0.1, bottom: 0.2 }
});

// Chart options
chartComponent.chart.applyOptions({
  crosshair: {
    mode: 1, // Normal crosshair
  }
});

// And much more...
```

## Development Server Setup

### Running OakView Examples

Start the OakView dev server to test examples:
```bash
cd /path/to/oakview
npm run dev
```

Open: http://localhost:5173/examples/volttrading-integration/

### Running Your Project with OakView

Most projects will have their own dev server. For example:

**With Vite:**
```bash
cd /path/to/my-trading-app
npm install
npm run dev
```

**With Python HTTP server (simple HTML):**
```bash
cd /path/to/my-trading-app
python -m http.server 8000
```

Open: http://localhost:8000/

### Configuring Your Build Tool

If using Vite, you may need to allow OakView imports:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    fs: {
      allow: [
        // Allow serving files from OakView
        resolve(__dirname, '../oakview'),
        // Allow workspace root
        resolve(__dirname, '..')
      ]
    }
  }
});
```

## Working with Multiple Chart Layouts

```html
<oakview-chart-layout
  id="chart"
  layout="quad"    <!-- single, double, triple, quad -->
  symbol="AAPL"
  theme="dark">
</oakview-chart-layout>

<script type="module">
import 'oakview';

const chartLayout = document.getElementById('chart');

// Listen for layout changes
chartLayout.addEventListener('layout-change', (e) => {
  console.log('New layout:', e.detail.layout);
});

// Listen for symbol changes
chartLayout.addEventListener('symbol-change', (e) => {
  console.log('New symbol:', e.detail.symbol);
});

// Listen for interval changes
chartLayout.addEventListener('interval-change', (e) => {
  console.log('New interval:', e.detail.interval);
});
</script>
```

## API Reference

### OakViewChartLayout

Web component for full charting layout with toolbar and multiple chart support.

**Attributes:**
- `layout` - 'single', 'double', 'triple', 'quad'
- `symbol` - Stock symbol
- `theme` - 'light' or 'dark'

**Methods:**
- `setDataProvider(provider)` - Set data provider instance
- `getChartCount()` - Get number of charts
- `getChartAt(index)` - Get OakViewChart instance at index

**Events:**
- `layout-change` - Fired when layout changes
- `symbol-change` - Fired when symbol changes
- `interval-change` - Fired when timeframe changes

### OakViewChart (Component)

Individual chart component with toolbar.

**Public Properties (Direct Access):**
- `chart` - IChartApi instance (lightweight-charts)
- `currentSeries` - ISeriesApi instance (main candlestick series)
- `series` - Map of all series (indicators, overlays)

**Methods:**
- `setData(data)` - Set historical OHLCV data
- `updateRealtime(bar)` - Update with real-time bar
- `setDataProvider(provider)` - Set custom data provider
- `getDataProvider()` - Get current data provider

**Example:**
```javascript
const chartComponent = chartLayout.getChartAt(0);

// Direct property access
chartComponent.chart.timeScale().fitContent();
chartComponent.currentSeries.createPriceLine({...});
chartComponent.series.set('indicator-1', lineSeriesInstance);
```

### OakViewDataProvider

**Methods to implement:**

```javascript
class MyProvider extends OakViewDataProvider {
  async initialize(config) { }

  async fetchHistorical(symbol, interval, from, to) {
    // Must return: Array<{ time, open, high, low, close, volume }>
  }

  subscribe(symbol, interval, callback) {
    // Call callback(bar) for real-time updates
    // Must return: unsubscribe function
  }

  async searchSymbols(query) {
    // Optional: return symbol search results
  }

  disconnect() {
    // Optional: cleanup
  }
}
```

## Example Implementations

Check the `examples/` folder for complete working examples:

- **CSV Provider**: `examples/csv-example/` - Load historical data from CSV files
- **VoltTrading Integration**: `examples/volttrading-integration/` - Real-time data via WebSocket

## TypeScript Support

TypeScript definitions will be added in a future release. For now, you can use JSDoc comments for type safety:

```javascript
/**
 * @typedef {import('oakview').OakViewDataProvider} OakViewDataProvider
 * @typedef {import('oakview').OakViewChartLayout} OakViewChartLayout
 */

/** @type {OakViewDataProvider} */
const provider = new MyCustomProvider();
```

## Development Tips

### Hot Reload
When importing directly from source, changes to OakView will automatically reload your page (with Vite or similar dev servers).

### Debugging
Use browser DevTools to debug OakView source code directly:
1. Open DevTools (F12)
2. Go to Sources tab
3. Navigate to `oakview/src/` to see the source files
4. Set breakpoints as needed

### Common Development Issues

**Issue**: `Failed to fetch dynamically imported module`
- **Cause**: Build tool can't access OakView files
- **Fix**: Add OakView path to Vite's `server.fs.allow` config

**Issue**: Changes to OakView not reflected
- **Cause**: Using built files via npm link
- **Fix**: Switch to direct source imports OR rebuild after each change

**Issue**: Import path errors
- **Cause**: Relative paths are wrong
- **Fix**: Check your project structure and adjust `../../oakview/src/...` accordingly

## Browser Compatibility

OakView uses modern JavaScript features and requires:
- ES Modules support
- Custom Elements v1
- ResizeObserver API

Supported browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Real-World Example

Check out the complete VoltTrading integration:
- **Location**: `examples/volttrading-integration/`
- **What it shows**: Full backend integration with WebSocket real-time data
- **Provider code**: `examples/volttrading-integration/volttrading-provider.js`
- **Integration**: `examples/volttrading-integration/index.html`

This example demonstrates:
- Custom data provider implementation
- WebSocket connection management
- Real-time bar aggregation
- Multi-timeframe support
- Proper cleanup and error handling

## Next Steps

1. **Start with the example**: Run `npm run dev` and open the VoltTrading example
2. **Copy the provider**: Use `volttrading-provider.js` as a template for your backend
3. **Create your project**: Set up your project structure with relative imports
4. **Implement your provider**: Customize the provider to match your API
5. **Test and iterate**: Use direct source imports for fast development

## Questions?

- Check `/examples` folder for working implementations
- Read `CLAUDE.md` for OakView development guidelines
- See `/docs` for design specifications and TradingView analysis
