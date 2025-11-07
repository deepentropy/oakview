# OakView

A lightweight, embeddable Web Component wrapper for [TradingView's Lightweight Charts](https://github.com/tradingview/lightweight-charts).

## Features

- **Web Component**: Use as a standard HTML element `<oakview-chart>`
- **Framework Agnostic**: Works with vanilla JS, React, Vue, Angular, or any framework
- **Easy Integration**: Single script tag to include in any HTML page
- **Full API Access**: Complete access to lightweight-charts functionality
- **Responsive**: Automatically resizes with container
- **Theme Support**: Built-in light/dark themes
- **Multiple Chart Types**: Candlestick, Line, Area, Bar, Histogram

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage in External HTML

After building, include the script in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Chart Page</title>
    <script src="path/to/dist/oakview.umd.js"></script>
</head>
<body>
    <!-- Use the custom element -->
    <oakview-chart id="myChart" width="800" height="400" theme="dark"></oakview-chart>

    <script>
        const chart = document.getElementById('myChart');

        // Wait for chart to initialize
        chart.addEventListener('chart-ready', () => {
            // Add candlestick data
            chart.addCandlestickSeries([
                { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 },
                { time: '2024-01-02', open: 105, high: 115, low: 102, close: 112 }
            ]);

            chart.fitContent();
        });
    </script>
</body>
</html>
```

## API Reference

### HTML Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | number | container width | Chart width in pixels |
| `height` | number | 400 | Chart height in pixels |
| `theme` | 'light' \| 'dark' | 'dark' | Color theme |

### JavaScript Methods

#### `addCandlestickSeries(data, options)`
Add a candlestick series to the chart.

```javascript
chart.addCandlestickSeries([
    { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 }
], {
    upColor: '#26a69a',
    downColor: '#ef5350'
});
```

#### `addLineSeries(data, options)`
Add a line series to the chart.

```javascript
chart.addLineSeries([
    { time: '2024-01-01', value: 100 },
    { time: '2024-01-02', value: 105 }
], {
    color: '#2962ff',
    lineWidth: 2
});
```

#### `addAreaSeries(data, options)`
Add an area series to the chart.

```javascript
chart.addAreaSeries([
    { time: '2024-01-01', value: 100 }
], {
    topColor: 'rgba(41, 98, 255, 0.4)',
    bottomColor: 'rgba(41, 98, 255, 0.0)',
    lineColor: 'rgba(41, 98, 255, 1)'
});
```

#### `addBarSeries(data, options)`
Add a bar series to the chart.

```javascript
chart.addBarSeries([
    { time: '2024-01-01', open: 100, high: 110, low: 95, close: 105 }
]);
```

#### `addHistogramSeries(data, options)`
Add a histogram series to the chart.

```javascript
chart.addHistogramSeries([
    { time: '2024-01-01', value: 1000000, color: 'rgba(38, 166, 154, 0.5)' }
]);
```

#### `clearSeries()`
Remove all series from the chart.

```javascript
chart.clearSeries();
```

#### `fitContent()`
Fit the chart content to the viewport.

```javascript
chart.fitContent();
```

#### `getChart()`
Get the underlying lightweight-charts instance for advanced usage.

```javascript
const lwChart = chart.getChart();
// Use any lightweight-charts API
lwChart.timeScale().scrollToPosition(5);
```

#### `applyOptions(options)`
Apply chart options.

```javascript
chart.applyOptions({
    layout: {
        background: { color: '#000000' },
        textColor: '#ffffff'
    }
});
```

### Events

#### `chart-ready`
Fired when the chart is initialized and ready to use.

```javascript
chart.addEventListener('chart-ready', (event) => {
    console.log('Chart ready!', event.detail.chart);
});
```

## Examples

See the following files for complete examples:

- `example/demo.html` - Interactive demo with S&P 500 data from CSV
- `example-external.html` - External usage example with stock/crypto data
- `example/SP_SPX, 1D.csv` - Historical S&P 500 data for testing

## Architecture

### Project Structure

```
oakview/
├── src/
│   ├── oakview-chart.js     # Web Component implementation
│   └── csv-loader.js        # CSV data loader utility
├── example/
│   ├── demo.html            # Interactive demo
│   └── SP_SPX, 1D.csv      # Sample S&P 500 data
├── dist/                     # Built files (after npm run build)
│   ├── oakview.es.js        # ES module
│   └── oakview.umd.js       # UMD bundle (for <script> tags)
├── index.html               # Landing page
├── example-external.html    # External usage example
├── vite.config.js           # Build configuration
└── package.json
```

### Technology Stack

- **Lightweight Charts**: Core charting library from TradingView
- **Web Components**: Standard browser API for custom elements
- **Vite**: Modern build tool for bundling
- **Shadow DOM**: Encapsulation for styles and markup

## Browser Support

OakView uses modern Web Components APIs and requires:

- Chrome/Edge 79+
- Firefox 63+
- Safari 13.1+

For older browsers, you may need polyfills.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.