# OakView

A lightweight, embeddable Web Component for [TradingView's Lightweight Charts v5](https://github.com/tradingview/lightweight-charts) with built-in UI controls and flexible data provider architecture.

## Features

- **Simple Tag**: `<oakview>` - Full-featured chart layout with toolbar and multiple panes
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
    <oakview 
        id="chart" 
        layout="single" 
        symbol="SPX" 
        theme="dark">
    </oakview>
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

OakView is **data-independent**. Implement your own data provider by extending `OakViewDataProvider`:

```javascript
import { OakViewDataProvider } from 'oakview';

class MyDataProvider extends OakViewDataProvider {
    /**
     * Initialize the provider
     */
    async initialize(config) {
        // Setup connections, authenticate, etc.
    }

    /**
     * Fetch historical data
     * @param {string} symbol - Symbol to fetch
     * @param {string} interval - Time interval (1m, 5m, 1h, 1D, etc.)
     * @returns {Promise<Array>} Array of OHLCV bars
     */
    async fetchHistorical(symbol, interval) {
        // Return array of { time, open, high, low, close, volume }
        return [
            { time: 1672531200, open: 100, high: 110, low: 95, close: 105 }
        ];
    }

    /**
     * Search for symbols (optional)
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of symbol objects
     */
    async searchSymbols(query) {
        return [
            { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' }
        ];
    }

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

### `<oakview>`

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
- Data resampling for higher timeframes

### WebSocket Example
Real-time data streaming example:

```bash
cd examples/websocket-example
npm install
npm run dev
```

## Architecture

### Project Structure

```
oakview/
├── src/
│   ├── index.js                      # Main entry point
│   ├── oakview-chart-layout.js       # Layout component
│   ├── oakview-chart-ui.js           # Chart with UI
│   ├── oakview-chart.js              # Base chart component
│   └── data-providers/
│       ├── base.js                   # Base data provider class
│       └── index.js                  # Exports
├── examples/
│   ├── csv-example/                  # CSV data provider example
│   │   ├── providers/
│   │   │   └── csv-provider.js       # CSV implementation
│   │   ├── data/
│   │   │   ├── SPX_1D.csv
│   │   │   └── QQQ_60.csv
│   │   └── index.html
│   └── websocket-example/            # WebSocket example
├── dist/                              # Built files
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

**Note**: `<oak-view>` internally uses `<oakview-chart>` elements for individual panes, but you should **never** use `<oakview-chart>` directly. Always use `<oak-view>` which manages the layout, toolbar, and multiple chart panes.

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
