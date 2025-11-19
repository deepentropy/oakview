# OakView

A lightweight, embeddable Web Component for [TradingView's Lightweight Charts v5](https://github.com/tradingview/lightweight-charts) with built-in UI controls and flexible data provider architecture.

## Features

- **Simple Tag**: `<oak-view>` - Full-featured chart layout with toolbar and multiple panes
- **UI Controls**: Built-in toolbar for chart type, timeframe, symbol search, and layout management
- **Data Independent**: Bring your own data provider (CSV, WebSocket, REST API, etc.)
- **Full Chart Access**: Direct access to lightweight-charts v5 API via `getChart()`
- **Framework Agnostic**: Works with vanilla JS, React, Vue, Angular, or any framework
- **Responsive**: Automatically resizes with container
- **Theme Support**: Built-in light/dark themes
- **Multiple Layouts**: Single, dual, triple, or quad pane layouts

## Quick Start

### Installation

```bash
npm install oakview
```

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

### Basic Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>OakView Chart</title>
    <script type="module">
        import 'oakview';
        
        // Custom data provider
        class MyDataProvider extends OakViewDataProvider {
            async fetchHistorical(symbol, interval) {
                const response = await fetch(`/api/data/${symbol}/${interval}`);
                return response.json();
            }
        }
        
        // Initialize chart
        const chart = document.getElementById('chart');
        const provider = new MyDataProvider();
        chart.setDataProvider(provider);
        
        // Listen for chart ready event
        chart.addEventListener('chart-ready', () => {
            console.log('Chart is ready!');
        });
    </script>
</head>
<body>
    <oak-view 
        id="chart" 
        layout="single" 
        symbol="SPX" 
        theme="dark">
    </oak-view>
</body>
</html>
```

### Using the Chart API Directly

OakView provides UI controls but gives you **full access** to the underlying lightweight-charts instance:

```javascript
// Get the chart
const chart = document.getElementById('chart');

// Get a specific pane's chart element
const chartElement = chart.getChartAt(0);

// Get the lightweight-charts instance for full control
const chart = chartElement.getChart();

// Now use the full lightweight-charts v5 API
import { CandlestickSeries, LineSeries } from 'lightweight-charts';

// Add a custom series
const series = chart.addSeries(CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350'
});

// Set data on the series
series.setData([
    { time: 1672531200, open: 100, high: 110, low: 95, close: 105 },
    { time: 1672617600, open: 105, high: 115, low: 102, close: 112 }
]);

// Add an indicator as a separate series
const maLine = chart.addSeries(LineSeries, {
    color: '#2962ff',
    lineWidth: 2
});
maLine.setData([
    { time: 1672531200, value: 102 },
    { time: 1672617600, value: 108 }
]);

// Use any lightweight-charts API
chart.timeScale().fitContent();
chart.priceScale('right').applyOptions({ autoScale: true });
```

### Using the Convenience API

For simple use cases, use `setData()` which works with the UI controls:

```javascript
const chartElement = chart.getChartAt(0);

// Set data - will update based on selected chart type from toolbar
chartElement.setData([
    { time: 1672531200, open: 100, high: 110, low: 95, close: 105 },
    { time: 1672617600, open: 105, high: 115, low: 102, close: 112 }
]);

// User can change chart type via toolbar, and data automatically updates
```

## Data Providers

OakView uses a flexible data provider system to fetch and stream market data. You implement a provider by extending the `OakViewDataProvider` base class.

### 🚀 Quick Start (1 Hour to Working Chart)

**Step 1**: Import TypeScript types (even if not using TypeScript)
```typescript
import type { OakViewDataProvider, OHLCVBar } from 'oakview';
```

**Step 2**: Read the Quick Reference (5 minutes)
- **[Quick Reference](./docs/DATA_PROVIDER_QUICKREF.md)** - One-page getting started guide

**Step 3**: Implement your provider
```javascript
import { OakViewDataProvider } from 'oakview';

class MyProvider extends OakViewDataProvider {
  async initialize(config) {
    this.apiKey = config.apiKey;
  }

  async fetchHistorical(symbol, interval, from, to) {
    const response = await fetch(`https://api.example.com/bars?symbol=${symbol}`);
    const data = await response.json();
    
    return data.map(bar => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000), // Unix seconds
      open: parseFloat(bar.open),
      high: parseFloat(bar.high),
      low: parseFloat(bar.low),
      close: parseFloat(bar.close),
      volume: parseFloat(bar.volume || 0)
    })).sort((a, b) => a.time - b.time); // Sort ascending
  }
}
```

**Step 4**: Validate your provider (catches 90% of issues)
```javascript
import { validateProvider } from 'oakview/validator';

const provider = new MyProvider();
await validateProvider(provider, { debug: true });
// Output:
// ✓ initialize() implemented correctly
// ✓ fetchHistorical() returned 100 valid bars
// ✅ Validation PASSED
```

### 📚 Complete Documentation

- **[Quick Reference](./docs/DATA_PROVIDER_QUICKREF.md)** - 5-minute read, minimal implementation
- **[Complete Guide](./docs/DATA_PROVIDER_GUIDE.md)** - Full documentation with examples and patterns
- **[Internal Behavior](./docs/DATA_PROVIDER_BEHAVIOR.md)** - When methods are called, caching, performance
- **[TypeScript Types](./src/data-providers/types.d.ts)** - Complete type definitions
- **[Migration Guide](./docs/DATA_PROVIDER_MIGRATION.md)** - For existing users
- **[Examples Directory](./examples/)** - Working implementations (CSV, WebSocket, VoltTrading)

### 🔧 Developer Tools

**Validation Helper** - Catch integration issues before runtime:
```javascript
import { validateProvider } from 'oakview/validator';

const result = await validateProvider(myProvider, { debug: true });
// Checks:
// ✓ Required methods implemented
// ✓ Correct return types  
// ✓ Time format (seconds not milliseconds)
// ✓ Sort order (ascending)
// ✓ Numeric prices (not strings)
```

**TypeScript Support** - Even if you don't use TypeScript:
```typescript
import type { OakViewDataProvider } from 'oakview';
// Types document exactly what OakView expects
```

### 📊 Method Reference

| Method | Required | Purpose |
|--------|----------|---------|
| `initialize(config)` | ✅ Yes | Connect to data source |
| `fetchHistorical(symbol, interval, from?, to?)` | ✅ Yes | Load historical bars |
| `subscribe(symbol, interval, callback)` | Optional | Real-time updates |
| `searchSymbols(query)` | Optional | Symbol search |
| `getAvailableIntervals(symbol)` | Optional | List available timeframes |
| `getBaseInterval(symbol)` | Optional | Get native resolution |
| `hasData(symbol, interval)` | Optional | Check data availability |
| `disconnect()` | Optional | Cleanup resources |

### 🎯 Common Issues Caught by Validator

```
❌ Time appears to be in milliseconds (1704067200000)
   Must be Unix seconds. Convert with: Math.floor(timestamp / 1000)

❌ Bar.open must be a number, got string (value: "185.14")

❌ Data must be sorted in ASCENDING order (oldest first)
   Use .sort((a, b) => a.time - b.time)

⚠️  Found 5 duplicate timestamps. Deduplicate before returning.
```

### 💡 Example Providers

Working implementations you can reference:

- **[CSV Provider](./examples/csv-example/providers/csv-provider.js)** - Static CSV files
- **[WebSocket Template](./examples/websocket-example/providers/custom-websocket-provider.js)** - Generic real-time
- **[VoltTrading Provider](./examples/volttrading-integration/volttrading-provider.js)** - Production reference

### ⏱️ Integration Time

- **Before documentation**: 4-8 hours of trial-and-error debugging
- **After documentation**: ~1 hour to working chart
  - 5 min: Read Quick Reference
  - 10 min: Copy minimal example
  - 2 min: Validate provider
  - 30 min: Fix issues (guided by validator)
  - 15 min: Test on chart

### 🆘 Get Help

If you're stuck, check:
1. Are times in **seconds** (not milliseconds)?
2. Is data sorted **ascending** (oldest first)?
3. Are prices **numbers** (not strings)?
4. Did you run the validator?

For more help:
- [Troubleshooting Guide](./docs/DATA_PROVIDER_GUIDE.md#troubleshooting)
- [Internal Behavior Docs](./docs/DATA_PROVIDER_BEHAVIOR.md)
- [Feedback Response](./docs/FEEDBACK_RESPONSE.md)

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        // Close connections, clear cache, etc.
    }
}
```

### Example: CSV Data Provider

See `examples/csv-example/` for a complete implementation:

```javascript
import CSVDataProvider from './providers/csv-provider.js';

const provider = new CSVDataProvider({
    baseUrl: './data/',
    availableFiles: ['SPX_1D.csv', 'QQQ_60.csv']
});

await provider.initialize();
chart.setDataProvider(provider);
```

## API Reference

### `<oak-view>`

Main component with toolbar and multiple pane support.

#### HTML Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | 'single' \| 'dual' \| 'triple' \| 'quad' | 'single' | Pane layout |
| `symbol` | string | 'SYMBOL' | Initial symbol |
| `theme` | 'light' \| 'dark' | 'dark' | Color theme |

#### Methods

##### `setDataProvider(provider)`
Set the data provider for all charts.

```javascript
chart.setDataProvider(new MyDataProvider());
```

##### `getChartAt(index)`
Get a specific pane's chart element.

```javascript
const chartElement = chart.getChartAt(0);
```

##### `getChartCount()`
Get the number of chart panes.

```javascript
const count = chart.getChartCount(); // 1, 2, 3, or 4
```

##### `setLayout(layout)`
Change the pane layout.

```javascript
chart.setLayout('dual'); // 'single', 'dual', 'triple', 'quad'
```

#### Events

##### `symbol-change`
Fired when symbol is changed via toolbar.

```javascript
chart.addEventListener('symbol-change', (e) => {
    console.log('Symbol:', e.detail.symbol);
});
```

##### `interval-change`
Fired when interval is changed via toolbar.

```javascript
chart.addEventListener('interval-change', (e) => {
    console.log('Interval:', e.detail.interval);
});
```

##### `layout-change`
Fired when layout is changed.

```javascript
chart.addEventListener('layout-change', (e) => {
    console.log('Layout:', e.detail.layout);
});
```

### Chart Element (Pane)

Individual chart within a layout.

#### Methods

##### `getChart()`
Get the lightweight-charts instance for **full API control**.

```javascript
const chart = chartElement.getChart();
// Use any lightweight-charts v5 API
const series = chart.addSeries(CandlestickSeries, options);
series.setData(data);
```

##### `setData(data)`
Set data for the main series (works with UI chart type selector).

```javascript
chartElement.setData([
    { time: 1672531200, open: 100, high: 110, low: 95, close: 105 }
]);
```

##### `applyOptions(options)`
Apply chart options.

```javascript
chartElement.applyOptions({
    layout: {
        background: { color: '#000000' },
        textColor: '#ffffff'
    }
});
```

##### `fitContent()`
Fit chart content to viewport.

```javascript
chartElement.fitContent();
```

## Examples

### CSV Example

Complete working example with CSV data loading:

```bash
cd examples/csv-example
npm install
npm run dev
```

Features:
- CSV file loading with PapaParse
- Multiple symbols and timeframes
- Symbol search

## Architecture

### Project Structure

```
oakview/
├── src/
│   ├── index.js                      # Main entry point (exports only public API)
│   ├── oak-view-layout.js            # <oak-view> component (PUBLIC)
│   ├── oak-view-chart.js             # Internal chart component (PRIVATE - do not use)
│   ├── oakview-variables.css         # CSS variables
│   └── data-providers/
│       ├── index.js
│       └── base.js                   # OakViewDataProvider base class (PUBLIC)
├── examples/
│   └── csv-example/                  # CSV data provider example
│       ├── index.html
│       ├── providers/
│       │   └── csv-provider.js       # Multi-file CSV provider
│       └── data/
│           ├── SPX_1D.csv
│           └── QQQ_60.csv
├── dist/
│   ├── oakview.es.js                 # ES module
│   └── oakview.umd.js                # UMD bundle
└── package.json
```

### Technology Stack

- **Lightweight Charts v5**: Core charting library from TradingView
- **Web Components**: Standard browser API for custom elements
- **Vite**: Modern build tool for bundling
- **Shadow DOM**: Encapsulation for styles and markup

## Design Principles

1. **Data Independence**: No built-in data loading - bring your own provider
2. **Full Control**: Direct access to lightweight-charts API via `getChart()`
3. **UI Convenience**: Built-in toolbar for common operations
4. **No Wrappers**: Don't duplicate lightweight-charts API - expose it directly
5. **Single Entry Point**: Use `<oak-view>` for all applications - it's the only public component

**Note**: Internally, `<oak-view>` uses a private `<oakview-internal-chart>` element for each chart pane. This internal component is **not exposed** and should **never** be used directly. Always use `<oak-view>` which manages everything automatically.

## Browser Support

OakView uses modern Web Components APIs and requires:

- Chrome/Edge 79+
- Firefox 63+
- Safari 13.1+

For older browsers, you may need polyfills.

## Migration from v1.x

If you were using the old API:

**Old (v1.x)**:
```javascript
chart.addCandlestickSeries(data, options);
chart.addLineSeries(data, options);
```

**New (v2.x)**:
```javascript
// Get the chart instance first
const lwChart = chart.getChart();

// Use lightweight-charts v5 API directly
import { CandlestickSeries, LineSeries } from 'lightweight-charts';
const series = lwChart.addSeries(CandlestickSeries, options);
series.setData(data);
```

Or use the convenience method:
```javascript
chart.setData(data); // Works with UI chart type selector
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
