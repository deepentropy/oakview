# OakView Examples

This directory contains working examples demonstrating how to integrate OakView into your projects.

## Available Examples

### 1. CSV Example
**Path:** `examples/csv-example/`

Load and display historical market data from CSV files. Perfect for:
- Static data visualization
- Backtesting strategies
- Demos and prototypes
- Offline applications

**Features:**
- Simple CSV file loading
- Flexible file naming patterns
- Multiple time format support
- No server required

[View CSV Example Documentation →](./csv-example/README.md)

### 2. WebSocket Example
**Path:** `examples/websocket-example/`

Real-time streaming market data via WebSocket connections. Ideal for:
- Live trading applications
- Real-time market monitoring
- Dynamic data updates
- Production applications

**Features:**
- Real-time data streaming
- Historical data loading
- Automatic reconnection
- Bar aggregation from ticks
- Multiple symbol support

[View WebSocket Example Documentation →](./websocket-example/README.md)

## Quick Start

### CSV Example

```bash
cd examples/csv-example
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### WebSocket Example

```bash
cd examples/websocket-example
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Project Structure

```
examples/
├── README.md                    # This file
├── csv-example/                 # Static CSV data example
│   ├── README.md               # Detailed documentation
│   ├── index.html              # Demo page
│   ├── package.json            # Dependencies
│   └── data/                   # Sample CSV files
│       ├── SPX_1D.csv
│       └── AAPL_1D.csv
│
└── websocket-example/           # Real-time WebSocket example
    ├── README.md               # Detailed documentation
    ├── index.html              # Demo page
    ├── package.json            # Dependencies
    └── providers/              # Custom provider implementations
        └── custom-websocket-provider.js
```

## Data Providers

OakView uses a flexible data provider system based on the `OakViewDataProvider` interface located in `src/data-providers/base.js`.

### Base Provider Interface

**Base Provider** (`src/data-providers/base.js`)
- Abstract base class that defines the provider interface
- Part of the core OakView library
- All custom providers must extend this class

### Example Provider Implementations

The examples folder contains reference implementations you can use as templates:

**CSV Provider** (`examples/csv-example/providers/csv-provider.js`)
- Example implementation for loading data from CSV files
- Supports various CSV formats
- Client-side only, no server needed
- Great starting point for custom static data providers

**VoltTrading Provider** (`examples/websocket-example/providers/volttrading-provider.js`)
- Example integration with VoltTrading services
- Real-time WebSocket streaming
- Historical data via REST API
- Reference for building WebSocket-based providers

### Creating Custom Providers

To create your own data provider:

1. Extend the `OakViewDataProvider` base class from `src/data-providers/base.js`
2. Implement required methods:
   - `initialize(config)` - Setup and connection
   - `fetchHistorical(symbol, interval, from, to)` - Load historical data
   - `subscribe(symbol, interval, callback)` - Real-time updates (optional)
   - `disconnect()` - Cleanup (optional)

Example:

```javascript
import OakViewDataProvider from '../path/to/oakview/src/data-providers/base.js';

class MyCustomProvider extends OakViewDataProvider {
  async initialize(config) {
    // Setup your connection
  }

  async fetchHistorical(symbol, interval, from, to) {
    // Fetch and return historical data
    return [
      { time: 1704067200, open: 100, high: 102, low: 99, close: 101, volume: 1000000 },
      // ... more bars
    ];
  }

  subscribe(symbol, interval, callback) {
    // Setup real-time subscription
    // Call callback(bar) when new data arrives
    return () => {
      // Cleanup function
    };
  }

  disconnect() {
    // Cleanup resources
  }
}

export default MyCustomProvider;
```

## Integration Guide

### Step 1: Install OakView

For development (from local source):
```bash
# In your project
npm install ../path/to/oakview
```

For production (once published):
```bash
npm install oakview
```

### Step 2: Import Components

```javascript
import 'oakview/oakview-chart-layout.js';
import OakViewDataProvider from 'oakview/src/data-providers/base.js';
// Then use your custom provider that extends OakViewDataProvider
```

### Step 3: Create Provider

```javascript
const provider = new CSVDataProvider({
  baseUrl: './data/',
  filePattern: (symbol, interval) => `${symbol}_${interval}.csv`
});

await provider.initialize();
```

### Step 4: Setup Chart

```html
<oakview-chart-layout
  id="chart"
  symbol="AAPL"
  interval="1D"
  theme="dark"
  layout="single">
</oakview-chart-layout>
```

```javascript
const chart = document.getElementById('chart');
chart.setDataProvider(provider);
```

## Common Configuration Options

### Chart Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | string | - | Stock/asset symbol |
| `interval` | string | `'1D'` | Timeframe (1, 5, 15, 60, 1D, 1W) |
| `theme` | string | `'dark'` | Color theme (dark/light) |
| `layout` | string | `'single'` | Chart layout (single/split/quad) |

### Data Provider Options

#### CSV Provider

```javascript
new CSVDataProvider({
  baseUrl: './data/',           // Base path for CSV files
  filename: 'data.csv',         // Fixed filename (optional)
  filePattern: (s, i) => `...`  // Custom naming function
})
```

#### Custom WebSocket Provider

```javascript
new CustomWebSocketProvider({
  wsUrl: 'wss://...',           // WebSocket endpoint
  apiUrl: 'https://...',        // REST API endpoint
  apiKey: 'your-key',           // Authentication (optional)
  options: { ... }              // Additional options
})
```

## Data Format Requirements

### OHLCV Data Structure

All providers must return data in this format:

```javascript
{
  time: 1704067200,        // Unix timestamp (seconds) or ISO date string
  open: 100.50,            // Opening price
  high: 102.75,            // Highest price
  low: 99.25,              // Lowest price
  close: 101.00,           // Closing price
  volume: 1000000          // Trading volume (optional)
}
```

### Supported Time Formats

- Unix timestamp (seconds): `1704067200`
- Unix timestamp (milliseconds): `1704067200000`
- ISO 8601: `"2024-01-01T00:00:00Z"`
- Date only: `"2024-01-01"`
- Human-readable: `"2024-01-01 12:00:00"`

## Troubleshooting

### Charts Not Displaying

**Check:**
1. Data provider is properly initialized
2. Data is in correct format (see above)
3. Time values are valid
4. Browser console for errors

### CSV Files Not Loading

**Check:**
1. File path is correct
2. CSV has header row
3. Required columns exist (time, open, high, low, close)
4. CORS settings allow file access

### WebSocket Not Connecting

**Check:**
1. WebSocket URL is correct and accessible
2. Authentication credentials are valid
3. CORS/security settings allow WebSocket
4. Network/firewall doesn't block WebSocket

### Performance Issues

**Solutions:**
- Implement update throttling (limit to 10-30 updates/sec)
- Reduce number of simultaneous subscriptions
- Use appropriate chart intervals (longer = better performance)
- Consider data downsampling for historical data

## Browser Compatibility

OakView works in all modern browsers that support:
- ES6 Modules
- Web Components (Custom Elements)
- WebSocket (for real-time providers)
- Fetch API

**Supported Browsers:**
- Chrome 63+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Development Tips

### Hot Module Replacement

Both examples use Vite with HMR enabled. Changes to your code will automatically refresh the page.

### Debugging

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem('oakview:debug', 'true');
location.reload();
```

### Testing with Mock Data

Use the included mock provider for testing:

```javascript
import MockWebSocketProvider from './websocket-example/index.html';
// See WebSocket example for implementation
```

## Next Steps

- Customize chart appearance and styling
- Add technical indicators
- Implement drawing tools
- Build a complete trading interface
- Create your own data provider

## Resources

- [OakView Documentation](../docs/)
- [Lightweight Charts v5 Docs](https://tradingview.github.io/lightweight-charts/docs)
- [Data Provider API](../data-providers/README.md)

## Support

For questions or issues:
- GitHub Issues: [Create an Issue](https://github.com/yourrepo/oakview/issues)
- Documentation: [OakView Docs](../docs/)
- Examples: Check the example source code

## License

MIT License - See [LICENSE](../LICENSE) for details
